import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmpresaProfile } from './entities/empresa-profile.entity';
import { User } from '../users/entities/user.entity';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(
    @InjectRepository(EmpresaProfile)
    private readonly repo: Repository<EmpresaProfile>,
  ) {}

  async getMyProfile(user: User): Promise<EmpresaProfile> {
    const profile = await this.repo.findOne({ where: { user_id: user.id } });
    if (!profile) throw new NotFoundException('Perfil de empresa no encontrado.');
    return profile;
  }

  async updateMyProfile(user: User, dto: UpdateEmpresaDto): Promise<EmpresaProfile> {
    const profile = await this.getMyProfile(user);
    if (dto.nombre_comercial !== undefined) profile.nombre_comercial = dto.nombre_comercial;
    if (dto.sitio_web !== undefined) profile.sitio_web = dto.sitio_web;
    if (dto.umbral_creditos !== undefined) profile.umbral_creditos = dto.umbral_creditos;
    return this.repo.save(profile);
  }
}
