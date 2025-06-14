import { Request, Response } from 'express';
import prisma from '../db/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

const getFrontdesk = (req: Request, res: Response) => {
    res.json({ message: 'Frontdesk route' });
};

const login = async (req: Request, res: Response) => {
    try{
        const { email, password } = req.body;
        const frontdesk = await prisma.frontDesk.findUnique({
            where: {
                email
            }
        });
        if(!frontdesk){
            return res.status(401).json({ message: "Invalid credentials" });        
        }
        const isValidPassword = await bcrypt.compare(password, frontdesk.password);
        if(!isValidPassword){
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = jwt.sign({ userId: frontdesk.id, role: "frontdesk", hotelId: frontdesk.hotelId }, env.jwt.secret, { expiresIn: "24h" });
        res.json({ token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const getShuttle = async (req: Request, res: Response) => {
    try{
        const userId = (req as any).user.userId;
        console.log(userId);
        const shuttle = await prisma.shuttle.findMany({
            where: {
                hotel: {
                    admins: {
                        some: {
                            id: parseInt(userId)
                        }
                    }
                }
            }
        });
        res.json({ shuttle });
    } catch (error) {
        console.error("Get shuttle error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const getDriver = async (req: Request, res: Response) => {
    try{
        const userId = (req as any).user.userId;
        const drivers = await prisma.driver.findMany({
            where: {
                hotel: {
                    admins: {
                        some: {
                            id: parseInt(userId)
                        }
                    }
                }
            }
        });
        res.json({ drivers });
    } catch (error) {
        console.error("Get driver error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


export default { getFrontdesk, getShuttle, getDriver, login };