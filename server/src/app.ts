import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { errorMiddleware } from './middleware/error.middleware.js';
import authRoutes from './modules/auth/auth.routes.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'GitHub Clone API is running',
  });
});

app.use('/api/auth', authRoutes);

app.use(errorMiddleware);

export default app;
