"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterInfluencerDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class RegisterInfluencerDto {
    email;
    password;
    nombre_artistico;
    bio;
    ubicacion;
    tarifa_base;
    fecha_nacimiento;
    tutor_nombre;
    tutor_documento_id;
    tutor_email;
    tutor_autorizacion;
    get _es_menor() {
        if (!this.fecha_nacimiento)
            return false;
        const birth = new Date(this.fecha_nacimiento);
        const age18 = new Date();
        age18.setFullYear(age18.getFullYear() - 18);
        return birth > age18;
    }
}
exports.RegisterInfluencerDto = RegisterInfluencerDto;
__decorate([
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterInfluencerDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    __metadata("design:type", String)
], RegisterInfluencerDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterInfluencerDto.prototype, "nombre_artistico", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterInfluencerDto.prototype, "bio", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterInfluencerDto.prototype, "ubicacion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], RegisterInfluencerDto.prototype, "tarifa_base", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], RegisterInfluencerDto.prototype, "fecha_nacimiento", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o._es_menor),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterInfluencerDto.prototype, "tutor_nombre", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o._es_menor),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RegisterInfluencerDto.prototype, "tutor_documento_id", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o._es_menor),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterInfluencerDto.prototype, "tutor_email", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o._es_menor),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RegisterInfluencerDto.prototype, "tutor_autorizacion", void 0);
//# sourceMappingURL=register-influencer.dto.js.map