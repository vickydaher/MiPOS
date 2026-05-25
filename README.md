# MiPOS Pro

Sistema de Punto de Venta para escritorio, desarrollado con Electron y JavaScript. Diseñado para negocios que requieren control completo de inventario, ventas, mermas y administración de personal desde una aplicación de escritorio sin dependencia de internet.

---

## Funcionalidades

### Dashboard
- Estadísticas en tiempo real: ingresos, costos y ganancias
- Gráficas de ventas de los últimos 7 días
- Comparativa de ingresos vs costos vs ganancia
- Ranking de productos más y menos vendidos
- Distribución de categorías en stock
- Panel de alertas de stock bajo

### Inventario
- Alta, edición y eliminación de productos
- Control de stock con umbrales de alerta configurables
- Filtros por categoría, proveedor y nivel de stock
- Búsqueda por nombre, SKU o categoría
- Campos especializados por tipo de producto: material base, color, hilo de refuerzo, colorante
- Cálculo automático de margen de ganancia
- Exportación a Excel

### Ventas
- Registro de ventas con carrito multi-producto
- Compatibilidad con escáner de código de barras
- Múltiples métodos de pago: efectivo, tarjeta débito, tarjeta crédito, transferencia
- Generación e impresión de tickets de venta
- Historial completo con filtros por empleado, producto y rango de fechas

### Mermas
- Registro de bajas de inventario por daño, extravío, robo o vencimiento
- Asignación de responsable por merma
- Cálculo automático de pérdida en costo y ganancia
- Historial de auditoría detallado

### Proveedores
- Gestión completa de proveedores con datos fiscales: RFC, CURP, NSS
- Directorio de contactos, direcciones y condiciones de pago
- Exportación a Excel

### Empleados
- Alta de colaboradores con foto para gafete
- Datos legales: CURP, NSS, RFC
- Generación e impresión de gafete de identificación
- Historial de ventas por empleado con análisis de desempeño

---

## Tecnologías

| Tecnología | Uso |
|---|---|
| Electron | Framework para aplicación de escritorio multiplataforma |
| Node.js | Entorno de ejecución y proceso principal |
| JavaScript | Lógica del sistema |
| HTML5 / CSS3 | Interfaz de usuario |
| Chart.js | Gráficas y visualización de datos |
| SheetJS | Exportación a Excel |
| localStorage | Persistencia de datos local |

---

## Instalación

**Requisitos:** Node.js 16 o superior

```bash
git clone https://github.com/vickydaher/MiPOS.git
cd MiPOS
npm install
npm start
```

Para generar el ejecutable (.exe):

```bash
npm run build
```

---

## Estructura del proyecto

```
MiPOS/
├── index.html        # Interfaz principal
├── index.js          # Lógica del sistema
├── styles.css        # Estilos
├── main.js           # Proceso principal de Electron
└── package.json      # Dependencias
```

---

## Autor

**Victor Javier Herrera Pérez**
GitHub: [vickydaher](https://github.com/vickydaher)
