import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import guestRouter from './routes/guestRouter';
import adminRouter from './routes/adminRouter';
import frontdeskRouter from './routes/frontdeskRouter';
import driverRouter from './routes/driverRouter';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Health API' });
});

app.use("/guest", guestRouter);
app.use("/admin", adminRouter);
app.use("/frontdesk", frontdeskRouter);
app.use("/driver", driverRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 