import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RatingPageDto } from './dto/rating-page.dto';
import { RatingsService } from './ratings.service';
import { EmpresaRatingsService } from './empresa-ratings.service';

describe('Paginación de reseñas', () => {
  it.each([RatingsService, EmpresaRatingsService])('limita consultas a seis reseñas y conserva el total', async Service => {
    const repo = { findAndCount: jest.fn().mockResolvedValue([[{ id: 7, estrellas: 5, empresa: { nombre_comercial: 'Marca' }, influencer: { nombre_artistico: 'Creador' } }], 13]) };
    const service = new Service(repo as any, {} as any, {} as any, {} as any);
    const result = await service.getAll(1, 2);
    expect(repo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
      take: 6, skip: 6, order: { updated_at: 'DESC', id: 'DESC' },
    }));
    expect(result).toEqual(expect.objectContaining({ total: 13, page: 2, pageSize: 6 }));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).not.toHaveProperty('empresa');
    expect(result.items[0]).not.toHaveProperty('influencer');
  });
  it.each(['0', '-1', '1.5', 'abc', '100001'])('rechaza página inválida %s', async page => {
    expect((await validate(plainToInstance(RatingPageDto, { page }))).length).toBeGreaterThan(0);
  });
  it('usa primera página por defecto y transforma la query numérica', async () => {
    expect(plainToInstance(RatingPageDto, {}).page).toBe(1);
    const query = plainToInstance(RatingPageDto, { page: '2' });
    expect(query.page).toBe(2);
    expect(await validate(query)).toHaveLength(0);
  });
});
