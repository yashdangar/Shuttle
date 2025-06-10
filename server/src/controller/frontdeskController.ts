import { Request, Response } from 'express';

const getFrontdesk = (req: Request, res: Response) => {
    res.json({ message: 'Frontdesk route' });
};


export default { getFrontdesk };    