"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalStatus = exports.ContratoStatus = exports.ChatStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["EMPRESA"] = "empresa";
    UserRole["INFLUENCER"] = "influencer";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var ChatStatus;
(function (ChatStatus) {
    ChatStatus["ACTIVE"] = "active";
    ChatStatus["BLOCKED"] = "blocked";
})(ChatStatus || (exports.ChatStatus = ChatStatus = {}));
var ContratoStatus;
(function (ContratoStatus) {
    ContratoStatus["PENDING_PAYMENT"] = "pending_payment";
    ContratoStatus["FUNDED_IN_ESCROW"] = "funded_in_escrow";
    ContratoStatus["UNDER_REVIEW"] = "under_review";
    ContratoStatus["COMPLETED"] = "completed";
    ContratoStatus["IN_DISPUTE"] = "in_dispute";
})(ContratoStatus || (exports.ContratoStatus = ContratoStatus = {}));
var ProposalStatus;
(function (ProposalStatus) {
    ProposalStatus["PENDING"] = "pending";
    ProposalStatus["ACCEPTED"] = "accepted";
    ProposalStatus["COUNTERED"] = "countered";
    ProposalStatus["FUNDED"] = "funded";
})(ProposalStatus || (exports.ProposalStatus = ProposalStatus = {}));
//# sourceMappingURL=index.js.map