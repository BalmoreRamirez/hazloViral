export declare class RegisterInfluencerDto {
    email: string;
    password: string;
    nombre_artistico: string;
    bio?: string;
    ubicacion?: string;
    tarifa_base?: number;
    fecha_nacimiento: string;
    tutor_nombre?: string;
    tutor_documento_id?: string;
    tutor_email?: string;
    tutor_autorizacion?: boolean;
    get _es_menor(): boolean;
}
