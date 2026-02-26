import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { countFrames } from '../services/mp3Parser';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, //50mb
    fileFilter: (_req, file, cb) => {
        if(
            ['audio/mpeg', 'audio/mp3'].includes(file.mimetype) ||
            file.originalname.endsWith('.mp3')
        ) {
            cb(null,true);
        }
        else {
            cb(new Error('Invalid file type. Upload MP3 files only.'));
        }
    },
});

router.post('/file-upload', (req: Request, res:Response, next:NextFunction)=> {
    upload.single('file')(req, res, (err) =>{
        if(err instanceof multer.MulterError) {
            if(err.code === 'LIMIT_FILE_SIZE') {
                res.status(413).json({ error: 'File too large. Max is 50MB'});
                return;
            }
            res.status(400).json({ error: `Upload error: ${err.message}`});
            return;
        }
        if(err){
            res.status(400).json({ error: err.message });
            return ;
        }
        if (!req.file){
            res.status(400).json({error: 'No file Provided'});
            return;
        }
        try{
            const frameCount = countFrames(req.file.buffer);

            if(frameCount === 0){
                res.status(422).json({
                    error: 'No valid MPEG1 Layer 3 frames found. File may not be a valid MP3',});
                    return;
            }
            res.json({ frameCount });
        }
        catch (error) {
            next(error);
        }
    });
});

export {router as fileUploadRouter};