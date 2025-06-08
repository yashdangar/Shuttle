import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const signup = async (req: Request, res: Response) => {
    try {
        const { email, password, name , token:secretToken} = req.body;

        if(secretToken !== process.env.ADMIN_SECRET_TOKEN){
            return res.status(400).json({ message: 'Invalid token' });
        }

        if (!email || !password || !name) {
            return res.status(400).json({ message: 'Email, password and name are required' });
        }

        // Check if email already exists
        const existingAdmin = await prisma.admin.findUnique({
            where: { email }
        });

        if (existingAdmin) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new admin
        const admin = await prisma.admin.create({
            data: {
                name,
                email,
                password: hashedPassword,
            }
        });

        const token = jwt.sign(
            { userId: admin.id, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({ 
            message: 'Admin created successfully',
            token: token
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const admin = await prisma.admin.findUnique({
            where: { email }
        });

        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: admin.id, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const addFrontdesk = async (req: Request, res: Response) => {
    try {
        const { name, email, password, hotelId, phoneNumber } = req.body;
        const frontdesk = await prisma.frontDesk.create({
            data: {
                name,
                email,
                password,
                hotelId: parseInt(hotelId),
                phoneNumber: phoneNumber
            }
        }); 
        res.json({ frontdesk });
    } catch (error) {
        console.error('Add frontdesk error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

const getAdmin = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        
        const admin = await prisma.admin.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                hotelId: true,
                createdAt: true
            }
        });

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.json({ admin });
    } catch (error) {
        console.error('Get admin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default { getAdmin, login, signup, addFrontdesk };