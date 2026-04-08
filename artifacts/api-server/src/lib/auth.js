// @ts-nocheck
import bcrypt from "bcryptjs";
export async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}
export async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}
export function requireAuth(req, res, next) {
    if (!req.session.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session.userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        if (!roles.includes(req.session.userRole ?? "")) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        next();
    };
}
