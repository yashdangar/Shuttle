import { Request, Response } from 'express';

const getAdmin = (req: Request, res: Response) => {
    res.json({ message: 'Admin route' });
};

export default { getAdmin };