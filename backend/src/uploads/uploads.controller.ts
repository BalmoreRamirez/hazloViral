import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import sharp from 'sharp';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

const PDFS_DIR    = join(process.cwd(), 'uploads', 'pdfs');
const FILES_DIR   = join(process.cwd(), 'uploads', 'files');
const AVATARS_DIR = join(process.cwd(), 'uploads', 'avatars');

/** Estándares de avatar:
 *  - Entrada:  JPEG, PNG, WebP, GIF — máx 5 MB
 *  - Proceso:  Sharp resize 400×400 cover (crop centrado) → WebP calidad 80
 *  - Salida:   ~50-80 KB WebP, reducción promedio del 95% vs original
 */
const AVATAR_SIZE    = 400;   // px — soporta pantallas 2× retina
const AVATAR_QUALITY = 80;    // WebP quality (0-100)
const AVATAR_MAX_MB  = 5;

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

const AVATAR_ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // ── Avatar de perfil ──────────────────────────────────────────────────────
  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),           // buffer en RAM para que Sharp pueda procesarlo
      limits: { fileSize: AVATAR_MAX_MB * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!AVATAR_ALLOWED_MIME.has(file.mimetype)) {
          return cb(new BadRequestException('Solo se aceptan imágenes: JPEG, PNG, WebP o GIF'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @GetUser() user: User,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');

    ensureDir(AVATARS_DIR);

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e6)}.webp`;
    const destPath = join(AVATARS_DIR, filename);

    // Procesar con Sharp: resize cuadrado centrado → WebP calidad 80
    await sharp(file.buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
      .webp({ quality: AVATAR_QUALITY })
      .toFile(destPath);

    const avatarUrl = `/api/uploads/avatar/${filename}`;

    // Eliminar avatar anterior si existe
    const currentUser = await this.userRepo.findOne({ where: { id: user.id } });
    if (currentUser?.avatar_url) {
      const oldFilename = currentUser.avatar_url.split('/').pop();
      const oldPath = join(AVATARS_DIR, oldFilename ?? '');
      if (oldFilename && existsSync(oldPath)) {
        try { unlinkSync(oldPath); } catch { /* ignorar si falla */ }
      }
    }

    await this.userRepo.update(user.id, { avatar_url: avatarUrl });
    return { url: avatarUrl };
  }

  // GET público — avatares son nombres aleatorios
  @Get('avatar/:filename')
  serveAvatar(@Param('filename') filename: string, @Res() res: any) {
    if (filename.includes('/') || filename.includes('..')) throw new NotFoundException();
    const filePath = join(AVATARS_DIR, filename);
    if (!existsSync(filePath)) throw new NotFoundException('Avatar no encontrado');
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 año — el nombre cambia en cada update
    res.sendFile(filePath);
  }

  // ── PDF del contrato ──────────────────────────────────────────────────────
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

  @Get('pdf/:filename')
  servePdf(@Param('filename') filename: string, @Res() res: any) {
    if (filename.includes('/') || filename.includes('..')) throw new NotFoundException();
    const filePath = join(PDFS_DIR, filename);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.sendFile(filePath);
  }

  // ── Archivos de entregables ───────────────────────────────────────────────
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

  @Get('file/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: any) {
    if (filename.includes('/') || filename.includes('..')) throw new NotFoundException();
    const filePath = join(FILES_DIR, filename);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    const mime = mimeFromExt(filename);
    res.setHeader('Content-Type', mime);
    const disposition = mime.startsWith('video/') || mime.startsWith('image/') ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.sendFile(filePath);
  }
}
