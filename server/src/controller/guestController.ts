import { Request, Response } from 'express';

const getGuest = (req: Request, res: Response) => {
    res.json({ message: 'Guest route' });
};

export default { getGuest };