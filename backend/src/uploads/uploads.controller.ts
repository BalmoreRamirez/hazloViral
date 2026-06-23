import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const PDFS_DIR  = join(process.cwd(), 'uploads', 'pdfs');
const FILES_DIR = join(process.cwd(), 'uploads', 'files');

const ALLOWED_MIME: Record<string, 'video' | 'imagen' | 'banner' | 'documento'> = {
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/gif': 'imagen',
  'image/webp': 'imagen',
  'image/svg+xml': 'banner',
  'application/pdf': 'documento',
  'application/zip': 'documento',
  'application/x-zip-compressed': 'documento',
};

const MIME_FROM_TIPO: Record<string, string> = {
  'video/mp4':       'video/mp4',
  'video/quicktime': 'video/quicktime',
  'video/webm':      'video/webm',
  'image/jpeg':      'image/jpeg',
  'image/png':       'image/png',
  'image/gif':       'image/gif',
  'image/webp':      'image/webp',
  'image/svg+xml':   'image/svg+xml',
};

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function mimeFromExt(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf', '.zip': 'application/zip',
  };
  return map[ext] ?? 'application/octet-stream';
}

@Controller('uploads')
export class UploadsController {
  // ── PDF del contrato — solo subida requiere JWT ───────────────────────────
  @Post('pdf')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => { ensureDir(PDFS_DIR); cb(null, PDFS_DIR); },
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          return cb(new BadRequestException('Solo se aceptan archivos PDF'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    return { url: `/api/uploads/pdf/${file.filename}` };
  }

  // GET público — nombres de archivo son UUID aleatorios (seguridad por oscuridad)
  @Get('pdf/:filename')
  servePdf(@Param('filename') filename: string, @Res() res: any) {
    if (filename.includes('/') || filename.includes('..')) throw new NotFoundException();
    const filePath = join(PDFS_DIR, filename);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(filePath);
  }

  // ── Archivos de entregables — solo subida requiere JWT ────────────────────
  @Post('file')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => { ensureDir(FILES_DIR); cb(null, FILES_DIR); },
        filename: (_req, file, cb) => {
          cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME[file.mimetype]) {
          return cb(new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const tipo_archivo = ALLOWED_MIME[file.mimetype] ?? 'documento';
    return {
      url: `/api/uploads/file/${file.filename}`,
      tipo_archivo,
      nombre: file.originalname,
      size_bytes: file.size,
    };
  }

  // GET público — establece Content-Type correcto para que el navegador reproduzca inline
  @Get('file/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: any) {
    if (filename.includes('/') || filename.includes('..')) throw new NotFoundException();
    const filePath = join(FILES_DIR, filename);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    const mime = mimeFromExt(filename);
    res.setHeader('Content-Type', mime);
    // inline para video/imagen, attachment para ZIP
    const disposition = mime.startsWith('video/') || mime.startsWith('image/') ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.sendFile(filePath);
  }
}
