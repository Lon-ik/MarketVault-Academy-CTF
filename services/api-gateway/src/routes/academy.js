const express = require("express");
const { one, pool } = require("../db");
const { requireUser } = require("../auth");
const { deviceId } = require("../device");

const router = express.Router();

// Прогресс читается как объединение: устройство (основное хранилище) + аккаунт
// (старые записи, чтобы уже решённое не пропало).
async function progressFor(device, userId) {
  const row = await one(
    `SELECT COUNT(c.id) AS total_challenges,
            COUNT(c.id) FILTER (WHERE COALESCE(d.is_solved, p.is_solved, FALSE)) AS solved_challenges
       FROM academy.challenges c
       LEFT JOIN academy.device_progress d
         ON d.challenge_id = c.id AND d.device_id = $1
       LEFT JOIN academy.user_progress p
         ON p.challenge_id = c.id AND p.user_id = $2::uuid
      WHERE c.is_active = TRUE`,
    [device, userId]
  );
  const total = row ? Number(row.total_challenges) : 0;
  const solved = row ? Number(row.solved_challenges) : 0;
  return {
    total: total,
    solved: solved,
    percent: total ? Math.round((1000 * solved) / total) / 10 : 0,
  };
}

router.get("/challenges", requireUser, async (req, res) => {
  try {
    const device = deviceId(req, res);
    const result = await pool.query(
      `SELECT c.id, c.slug, c.title, c.service, c.category, c.difficulty,
              c.description, c.order_index,
              COALESCE(d.is_solved, p.is_solved, FALSE) AS is_solved,
              COALESCE(d.solved_at, p.solved_at) AS solved_at,
              COALESCE(d.hints_used, p.hints_used, 0) AS hints_used
       FROM academy.challenges c
       LEFT JOIN academy.device_progress d
         ON d.challenge_id = c.id AND d.device_id = $1
       LEFT JOIN academy.user_progress p
         ON p.challenge_id = c.id AND p.user_id = $2::uuid
       WHERE c.is_active = TRUE
       ORDER BY c.order_index`,
      [device, req.user.sub]
    );
    return res.json({ challenges: result.rows });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/leaderboard", requireUser, async (req, res) => {
  try {
    const rows = await pool.query(
      `SELECT u.username, v.solved_challenges, v.percent_solved
       FROM academy.v_user_progress v
       JOIN auth.users u ON u.id = v.user_id
       ORDER BY v.solved_challenges DESC, u.username ASC
       LIMIT 20`
    );
    return res.json({
      leaders: rows.rows.map((row) => ({
        username: row.username,
        solved: Number(row.solved_challenges),
        percent: Number(row.percent_solved),
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/progress", requireUser, async (req, res) => {
  try {
    const device = deviceId(req, res);
    const summary = await progressFor(device, req.user.sub);
    const services = await pool.query(
      `SELECT c.service,
              COUNT(*) AS total,
              COUNT(c.id) FILTER (WHERE COALESCE(d.is_solved, p.is_solved, FALSE)) AS solved
       FROM academy.challenges c
       LEFT JOIN academy.device_progress d
         ON d.challenge_id = c.id AND d.device_id = $1
       LEFT JOIN academy.user_progress p
         ON p.challenge_id = c.id AND p.user_id = $2::uuid
       WHERE c.is_active = TRUE
       GROUP BY c.service
       ORDER BY c.service`,
      [device, req.user.sub]
    );
    const recent = await pool.query(
      `SELECT c.slug, c.title, COALESCE(d.solved_at, p.solved_at) AS solved_at
       FROM academy.challenges c
       LEFT JOIN academy.device_progress d
         ON d.challenge_id = c.id AND d.device_id = $1
       LEFT JOIN academy.user_progress p
         ON p.challenge_id = c.id AND p.user_id = $2::uuid
       WHERE c.is_active = TRUE
         AND COALESCE(d.is_solved, p.is_solved, FALSE) = TRUE
       ORDER BY solved_at DESC NULLS LAST
       LIMIT 5`,
      [device, req.user.sub]
    );
    return res.json({
      ...summary,
      byService: services.rows.map((row) => ({
        service: row.service,
        total: Number(row.total),
        solved: Number(row.solved),
      })),
      recent: recent.rows,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/challenges/:slug/hints", requireUser, async (req, res) => {
  try {
    const device = deviceId(req, res);
    const challenge = await one(
      "SELECT id, hint_1, hint_2 FROM academy.challenges WHERE slug = $1 AND is_active = TRUE",
      [req.params.slug]
    );
    if (!challenge) {
      return res.status(404).json({ error: "challenge not found" });
    }
    await pool.query(
      `INSERT INTO academy.device_progress (device_id, challenge_id, hints_used)
       VALUES ($1, $2, 1)
       ON CONFLICT (device_id, challenge_id)
       DO UPDATE SET hints_used = academy.device_progress.hints_used + 1`,
      [device, challenge.id]
    );
    const level = Number(req.query.level || 1);
    return res.json({
      hint_1: challenge.hint_1,
      hint_2: level >= 2 ? challenge.hint_2 : null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/challenges/:slug/reveal", requireUser, async (req, res) => {
  try {
    const device = deviceId(req, res);
    const challenge = await one(
      `SELECT id, solution_payload, vulnerable_code, secure_code
       FROM academy.challenges WHERE slug = $1 AND is_active = TRUE`,
      [req.params.slug]
    );
    if (!challenge) {
      return res.status(404).json({ error: "challenge not found" });
    }
    await pool.query(
      `INSERT INTO academy.device_progress (device_id, challenge_id, solution_revealed)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (device_id, challenge_id)
       DO UPDATE SET solution_revealed = TRUE`,
      [device, challenge.id]
    );
    return res.json({
      solution_payload: challenge.solution_payload,
      vulnerable_code: challenge.vulnerable_code,
      secure_code: challenge.secure_code,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/challenges/:slug/solve", requireUser, async (req, res) => {
  try {
    const device = deviceId(req, res);
    const challenge = await one(
      "SELECT id, flag FROM academy.challenges WHERE slug = $1 AND is_active = TRUE",
      [req.params.slug]
    );
    if (!challenge) {
      return res.status(404).json({ error: "challenge not found" });
    }
    const submitted = String(req.body.flag || "").trim();
    if (submitted !== challenge.flag) {
      await pool.query(
        `INSERT INTO academy.device_progress
             (device_id, challenge_id, attempts, last_attempt_at)
         VALUES ($1, $2, 1, now())
         ON CONFLICT (device_id, challenge_id)
         DO UPDATE SET attempts = academy.device_progress.attempts + 1,
                       last_attempt_at = now()`,
        [device, challenge.id]
      );
      return res.status(400).json({ solved: false, error: "wrong flag" });
    }
    await pool.query(
      `INSERT INTO academy.device_progress
           (device_id, challenge_id, is_solved, solved_at, attempts, last_attempt_at)
       VALUES ($1, $2, TRUE, now(), 1, now())
       ON CONFLICT (device_id, challenge_id)
       DO UPDATE SET is_solved = TRUE,
                     solved_at = COALESCE(academy.device_progress.solved_at, now())`,
      [device, challenge.id]
    );
    // Дублируем в прогресс аккаунта: таблица лидеров и старые сверки читают её.
    await pool.query(
      `INSERT INTO academy.user_progress
           (user_id, challenge_id, is_solved, solved_at, attempts, last_attempt_at)
       VALUES ($1, $2, TRUE, now(), 1, now())
       ON CONFLICT (user_id, challenge_id)
       DO UPDATE SET is_solved = TRUE,
                     solved_at = COALESCE(academy.user_progress.solved_at, now())`,
      [req.user.sub, challenge.id]
    );
    return res.json({ solved: true, progress: await progressFor(device, req.user.sub) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;