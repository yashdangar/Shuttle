import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
    userId: string;
    role: string;
}

const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin role required.' });
        }
        // Add user info to request
        (req as any).user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

const frontdeskAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        
        if (decoded.role !== 'frontdesk') {
            return res.status(403).json({ message: 'Access denied. Frontdesk role required.' });
        }
        // Add user info to request
        (req as any).user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

export { adminAuthMiddleware, frontdeskAuthMiddleware };