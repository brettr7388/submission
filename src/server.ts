import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileUploadRouter } from './routes/fileUpload';

const app = express();

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(fileUploadRouter);

//catch all error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Something went wrong while the file was processing' });
});

export { app };
