function currentUser(req) {
  if (req.user) {
    return {
      id: req.user.sub || req.user.id,
      username: req.user.username || "user",
      role: req.user.role || "student",
    };
  }
  if (req.session && req.session.user) {
    return {
      id: req.session.user.id,
      username: req.session.user.username || "user",
      role: req.session.user.role || "student",
    };
  }
  return null;
}

module.exports = { currentUser };
