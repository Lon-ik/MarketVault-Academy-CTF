package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type contextKey string

const userContextKey contextKey = "user"

type app struct {
	pool   *pgxpool.Pool
	secret []byte
}

type product struct {
	ID     int64  `json:"id"`
	Title  string `json:"title"`
	Price  int64  `json:"price"`
	Seller string `json:"seller"`
	Stock  int    `json:"stock"`
}

type orderItem struct {
	Title    string `json:"title"`
	Price    int64  `json:"price"`
	Quantity int    `json:"quantity"`
}

type order struct {
	ID      int64       `json:"id"`
	BuyerID string      `json:"buyerId"`
	Total   int64       `json:"total"`
	Status  string      `json:"status"`
	Address string      `json:"address"`
	Notes   string      `json:"notes"`
	Flag    string      `json:"flag,omitempty"`
	Items   []orderItem `json:"items,omitempty"`
}

type redeemRequest struct {
	Amount int64 `json:"amount"`
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func (a *app) userID(r *http.Request) string {
	value, _ := r.Context().Value(userContextKey).(string)
	return value
}

func (a *app) withUser(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing token"})
			return
		}
		tokenString := strings.TrimPrefix(header, "Bearer ")
		token, err := jwt.Parse(tokenString, func(parsed *jwt.Token) (interface{}, error) {
			if parsed.Method.Alg() != "HS256" {
				return nil, errors.New("unexpected algorithm")
			}
			return a.secret, nil
		})
		if err != nil || !token.Valid {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid token"})
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid claims"})
			return
		}
		subject, _ := claims["sub"].(string)
		if _, err := uuid.Parse(subject); err != nil {
			writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid subject"})
			return
		}
		next(w, r.WithContext(context.WithValue(r.Context(), userContextKey, subject)))
	}
}

func (a *app) flagFor(ctx context.Context, slug, fallback string) string {
	var flag string
	if err := a.pool.QueryRow(
		ctx,
		"SELECT flag FROM academy.challenges WHERE slug = $1",
		slug,
	).Scan(&flag); err != nil {
		return fallback
	}
	return flag
}

func (a *app) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "inventory-service",
	})
}

func (a *app) listProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := a.pool.Query(
		r.Context(),
		"SELECT id, title, price, seller, stock FROM inventory.products ORDER BY id",
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}
	defer rows.Close()

	items := []product{}
	for rows.Next() {
		var item product
		if err := rows.Scan(&item.ID, &item.Title, &item.Price, &item.Seller, &item.Stock); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "scan failed"})
			return
		}
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"products": items})
}

func (a *app) productDetail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	var item product
	err = a.pool.QueryRow(
		r.Context(),
		"SELECT id, title, price, seller, stock FROM inventory.products WHERE id = $1",
		id,
	).Scan(&item.ID, &item.Title, &item.Price, &item.Seller, &item.Stock)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "product not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (a *app) wallet(w http.ResponseWriter, r *http.Request) {
	user := a.userID(r)
	var balance int64
	err := a.pool.QueryRow(
		r.Context(),
		"SELECT balance FROM inventory.wallets WHERE user_id = $1::uuid",
		user,
	).Scan(&balance)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "wallet not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"userId":  user,
		"balance": balance,
	})
}

func (a *app) topup(w http.ResponseWriter, r *http.Request) {
	user := a.userID(r)
	var body redeemRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid amount"})
		return
	}
	var balance int64
	err := a.pool.QueryRow(
		r.Context(),
		"UPDATE inventory.wallets SET balance = balance + $1 WHERE user_id = $2::uuid RETURNING balance",
		body.Amount,
		user,
	).Scan(&balance)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "wallet not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"balance": balance})
}

func (a *app) listOrders(w http.ResponseWriter, r *http.Request) {
	user := a.userID(r)
	rows, err := a.pool.Query(
		r.Context(),
		"SELECT id, user_id::text, total, status, address, notes FROM inventory.orders" +
			" WHERE user_id = $1::uuid ORDER BY id DESC",
		user,
	)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}
	defer rows.Close()

	items := []order{}
	for rows.Next() {
		var item order
		if err := rows.Scan(&item.ID, &item.BuyerID, &item.Total, &item.Status, &item.Address, &item.Notes); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "scan failed"})
			return
		}
		items = append(items, item)
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"orders": items})
}

func (a *app) orderDetail(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid id"})
		return
	}
	user := a.userID(r)
	var item order
	err = a.pool.QueryRow(
		r.Context(),
		"SELECT id, user_id::text, total, status, address, notes FROM inventory.orders WHERE id = $1",
		id,
	).Scan(&item.ID, &item.BuyerID, &item.Total, &item.Status, &item.Address, &item.Notes)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "order not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}

	rows, err := a.pool.Query(
		r.Context(),
		"SELECT title, price, quantity FROM inventory.order_items WHERE order_id = $1",
		id,
	)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var line orderItem
			if scanErr := rows.Scan(&line.Title, &line.Price, &line.Quantity); scanErr == nil {
				item.Items = append(item.Items, line)
			}
		}
	}
	if item.BuyerID != user {
		item.Flag = a.flagFor(r.Context(), "inventory-idor", "MV{IDOR_INVENTORY_ORDER}")
	}
	writeJSON(w, http.StatusOK, item)
}

func (a *app) redeem(w http.ResponseWriter, r *http.Request) {
	user := a.userID(r)
	var body redeemRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Amount <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid amount"})
		return
	}

	var balance int64
	err := a.pool.QueryRow(
		r.Context(),
		"SELECT balance FROM inventory.wallets WHERE user_id = $1::uuid",
		user,
	).Scan(&balance)
	if errors.Is(err, pgx.ErrNoRows) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "wallet not found"})
		return
	}
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}
	if balance < body.Amount {
		writeJSON(w, http.StatusPaymentRequired, map[string]string{"error": "insufficient funds"})
		return
	}

	time.Sleep(60 * time.Millisecond)

	var newBalance int64
	err = a.pool.QueryRow(
		r.Context(),
		"UPDATE inventory.wallets SET balance = balance - $1 WHERE user_id = $2::uuid RETURNING balance",
		body.Amount,
		user,
	).Scan(&newBalance)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "update failed"})
		return
	}

	var orderID int64
	_ = a.pool.QueryRow(
		r.Context(),
		"INSERT INTO inventory.orders (user_id, total, status, address, notes)" +
			" VALUES ($1::uuid, $2, 'paid', '', 'redeem') RETURNING id",
		user,
		body.Amount,
	).Scan(&orderID)

	response := map[string]interface{}{
		"orderId": orderID,
		"balance": newBalance,
	}
	if newBalance < 0 {
		response["flag"] = a.flagFor(r.Context(), "inventory-race-condition", "MV{RACE_DOUBLE_SPEND}")
	}
	writeJSON(w, http.StatusOK, response)
}

func (a *app) readFile(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	if name == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "name is required"})
		return
	}
	path := filepath.Join("/srv/inventory/files", name)
	data, err := os.ReadFile(path)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "file not found"})
		return
	}
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	_, _ = w.Write(data)
}

func main() {
	ctx := context.Background()
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgresql://marketvault:marketvault@postgres:5432/marketvault"
	}
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "weak-jwt-secret"
	}

	var pool *pgxpool.Pool
	for attempt := 0; attempt < 30; attempt++ {
		config, err := pgxpool.ParseConfig(dsn)
		if err != nil {
			log.Fatalf("invalid database config: %v", err)
		}
		config.MaxConns = 20
		candidate, err := pgxpool.NewWithConfig(ctx, config)
		if err == nil {
			if pingErr := candidate.Ping(ctx); pingErr == nil {
				pool = candidate
				break
			}
			candidate.Close()
		}
		log.Printf("waiting for postgres: %v", err)
		time.Sleep(2 * time.Second)
	}
	if pool == nil {
		log.Fatal("postgres is unavailable")
	}
	defer pool.Close()

	instance := &app{pool: pool, secret: []byte(secret)}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/inventory/health", instance.health)
	mux.HandleFunc("GET /api/inventory/products", instance.listProducts)
	mux.HandleFunc("GET /api/inventory/products/{id}", instance.productDetail)
	mux.HandleFunc("GET /api/inventory/wallet", instance.withUser(instance.wallet))
	mux.HandleFunc("POST /api/inventory/wallet/topup", instance.withUser(instance.topup))
	mux.HandleFunc("GET /api/inventory/orders", instance.withUser(instance.listOrders))
	mux.HandleFunc("GET /api/inventory/orders/{id}", instance.withUser(instance.orderDetail))
	mux.HandleFunc("POST /api/inventory/redeem", instance.withUser(instance.redeem))
	mux.HandleFunc("GET /api/inventory/files", instance.readFile)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("inventory-service listening on %s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}