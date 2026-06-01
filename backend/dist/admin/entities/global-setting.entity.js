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
exports.GlobalSetting = void 0;
const typeorm_1 = require("typeorm");
let GlobalSetting = class GlobalSetting {
    key;
    value;
    description;
};
exports.GlobalSetting = GlobalSetting;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ length: 100 }),
    __metadata("design:type", String)
], GlobalSetting.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], GlobalSetting.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], GlobalSetting.prototype, "description", void 0);
exports.GlobalSetting = GlobalSetting = __decorate([
    (0, typeorm_1.Entity)('global_settings')
], GlobalSetting);
//# sourceMappingURL=global-setting.entity.js.map