import { createHash } from 'crypto';

export function registrationDocuments(controllerName: string, contactEmail: string) {
  const terms = {
    title: 'Términos y condiciones de InfluSmart',
    sections: [
      { title: 'Responsable y servicio', text: `${controllerName} opera InfluSmart. Contacto: ${contactEmail}. La plataforma conecta creadores con comunidades en redes sociales con empresas que desean publicidad de sus productos y servicios, para que puedan negociar y monetizar colaboraciones.` },
      { title: 'Cuenta y representación', text: 'Debes proporcionar datos veraces, proteger tus credenciales y tener facultades para representar a la empresa que registras. Los menores de edad deben completar los datos y la autorización del tutor legal exigidos por la plataforma; una casilla no sustituye la comprobación de esa representación.' },
      { title: 'Colaboraciones dentro de la plataforma', text: 'La negociación, los contratos y los pagos de las colaboraciones deben realizarse dentro de InfluSmart. No compartas datos de contacto para eludir sus mecanismos de contratación. No publiques contenido ilegal ni que infrinja derechos de terceros.' },
      { title: 'Precios y pagos', text: 'Revisa importes, comisiones, entregables y fechas antes de confirmar una recarga o contrato. La aprobación de estos términos no autoriza por sí sola cobros. Cada operación requiere su confirmación. Las simulaciones identificadas como desarrollo no constituyen cobros reales ni documentos fiscales oficiales.' },
      { title: 'Contenido y derechos', text: 'Conservas los derechos sobre tu contenido y declaras contar con las autorizaciones necesarias para publicarlo y usarlo en las colaboraciones. Los permisos de uso publicitario, entregables y plazos deben acordarse en el contrato correspondiente.' },
      { title: 'Consultas y cambios', text: `Para consultas sobre tu cuenta, operaciones o estos términos escribe a ${contactEmail}. Los cambios de condiciones se comunicarán con su versión aplicable; esta aceptación no autoriza retroactivamente nuevas finalidades de tratamiento. Los derechos reconocidos por la legislación aplicable no se renuncian mediante estos términos.` },
    ],
  };
  const privacy = {
    title: 'Aviso de privacidad y tratamiento de datos personales',
    sections: [
      { title: 'Responsable y contacto', text: `${controllerName} es el responsable indicado para el tratamiento de datos en InfluSmart. Puedes contactar sobre privacidad en ${contactEmail}. Marco de referencia: Ley para la Protección de Datos Personales de El Salvador, Decreto Legislativo 144 y sus reformas aplicables.` },
      { title: 'Datos y finalidades', text: 'Se recaban datos de cuenta y contacto, perfil profesional o empresarial, identificación y representación o tutoría cuando corresponda. Se utilizan para crear y proteger tu cuenta, verificar el perfil, conectar creadores con empresas, negociar colaboraciones y gestionar contratos. Los datos bancarios, fiscales y de transacciones se tratan cuando se configuran o realizan pagos. Los mensajes y entregables se utilizan para prestar el servicio y atender controversias.' },
      { title: 'Visibilidad y destinatarios', text: 'Las empresas pueden consultar el nombre artístico, foto, biografía, ubicación, rubros, tarifa y métricas permitidas del creador. Los correos, usuarios de redes, documento, banco y datos de tutor del influencer no se entregan en su perfil a empresas. El contenido de fotos, archivos y mensajes puede revelar datos que publiques: evita incluir información privada. La administración accede según sus funciones. Proveedores de pago, correo, verificación social y alojamiento pueden intervenir cuando se utiliza la función correspondiente.' },
      { title: 'Alcance de la autorización', text: 'La autorización del registro se refiere a las finalidades aquí descritas para prestar el servicio. No incluye campañas publicitarias por correo, venta de datos ni una autorización general para nuevas finalidades. Estas requerirán su información y base jurídica o autorización separada cuando corresponda. Los tratamientos impuestos o permitidos por la ley se sujetan a esa base jurídica.' },
      { title: 'Conservación y seguridad', text: 'Los datos se conservan durante la prestación del servicio y, posteriormente, solo en la medida necesaria para obligaciones legales, reclamaciones y su acreditación. Se restringe el acceso por rol y se protegen las credenciales. La eliminación solicitada puede estar limitada por obligaciones legales; en ese caso debe informarse la razón y restringirse el uso a esa obligación.' },
      { title: 'Derechos y retiro del consentimiento', text: `Puedes solicitar información, acceso, rectificación, actualización, supresión, oposición y demás derechos aplicables, o retirar el consentimiento, escribiendo a ${contactEmail}. Identifica tu cuenta y la solicitud sin enviar contraseñas. Se comprobará tu identidad de forma proporcional. Retirar el consentimiento no convierte en ilícito el tratamiento previo y puede impedir continuar funciones que dependan de él; no afecta obligaciones legales de conservación.` },
      { title: 'Menores y datos sensibles', text: 'El registro de un menor conserva los requisitos de tutor legal y las restricciones de edad del servicio. La aceptación de esta pantalla no equivale a una firma del tutor verificada ni habilita por sí sola el tratamiento de datos sensibles que requiera una autorización escrita o equivalente adicional. No publiques información sensible en tu biografía, mensajes o entregables.' },
      { title: 'Proveedores y transferencias', text: `Antes de habilitar un tratamiento o transferencia que requiera información o garantías adicionales, el responsable debe informar los proveedores, destinos y condiciones aplicables. Puedes solicitar el detalle vigente en ${contactEmail}. Esta aceptación no constituye una autorización ilimitada a transferir información a cualquier tercero o país.` },
    ],
  };
  function version(document: typeof terms) {
    const hash = createHash('sha256').update(JSON.stringify(document)).digest('hex');
    return { ...document, version: `2026-10-28-${hash.slice(0, 16)}`, sha256: hash };
  }
  return { terms: version(terms), privacy: version(privacy) };
}
