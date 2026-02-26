import express, {Request, Response, NextFunction} from 'express';
import path from 'path';


const app = express()

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health' , (_req, res) => {
    res.json({ status: 'ok'});
});

export { app };