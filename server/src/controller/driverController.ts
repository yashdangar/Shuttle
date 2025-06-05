import { Request, Response } from 'express';

const getDriver = (req: Request, res: Response) => {
    res.json({ message: 'Driver route' });
};


export default { getDriver };