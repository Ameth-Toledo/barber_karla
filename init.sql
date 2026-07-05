-- ============================================================
-- Barberia - Base de datos (MySQL 8+)
-- Control de citas, clientes e inventario
-- ============================================================

CREATE DATABASE IF NOT EXISTS barberia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE barberia;

-- ------------------------------------------------------------
-- Clientes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  telefono      VARCHAR(30),
  notas         VARCHAR(255),
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clientes_nombre (nombre)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Citas (control diario)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citas (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cliente_id    INT UNSIGNED NOT NULL,
  fecha         DATE NOT NULL,
  hora          TIME NOT NULL,
  servicio      VARCHAR(120) NOT NULL DEFAULT 'Corte',
  precio        DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado        ENUM('pendiente','completada','cancelada') NOT NULL DEFAULT 'pendiente',
  notas         VARCHAR(255),
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_citas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  INDEX idx_citas_fecha (fecha),
  INDEX idx_citas_cliente (cliente_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Proveedores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedores (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  contacto      VARCHAR(120),
  telefono      VARCHAR(30),
  email         VARCHAR(120),
  notas         VARCHAR(255),
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Productos
-- categoria = 'venta'       -> productos que se venden al cliente (cera, spray, etc.)
-- categoria = 'uso_diario'  -> insumos que se consumen en el servicio (navajas, gel, talco, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(120) NOT NULL,
  categoria      ENUM('venta','uso_diario') NOT NULL,
  unidad_medida  VARCHAR(30) NOT NULL DEFAULT 'pza',
  stock_actual   DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_minimo   DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_compra  DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_venta   DECIMAL(10,2) NOT NULL DEFAULT 0,
  proveedor_id   INT UNSIGNED,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  INDEX idx_productos_categoria (categoria)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Movimientos de inventario (entradas de proveedor / salidas por venta o uso)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  producto_id    INT UNSIGNED NOT NULL,
  proveedor_id   INT UNSIGNED,
  tipo           ENUM('entrada','salida') NOT NULL,
  motivo         ENUM('compra','venta','uso_servicio','ajuste') NOT NULL DEFAULT 'ajuste',
  cantidad       DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha_hora     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notas          VARCHAR(255),
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_movimientos_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_movimientos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL,
  INDEX idx_movimientos_fecha (fecha_hora),
  INDEX idx_movimientos_producto (producto_id),
  INDEX idx_movimientos_tipo (tipo)
) ENGINE=InnoDB;

-- ============================================================
-- Datos iniciales sugeridos (categorias tipicas de una barberia)
-- Puedes editar/borrar estas filas libremente desde el panel.
-- ============================================================

INSERT INTO proveedores (nombre, contacto, telefono, email) VALUES
  ('Distribuidora de Barberia S.A.', 'Juan Perez', '555-100-2000', 'ventas@distribarberia.com');

INSERT INTO productos (nombre, categoria, unidad_medida, stock_actual, stock_minimo, precio_compra, precio_venta, proveedor_id) VALUES
  ('Cera para cabello', 'venta', 'pza', 0, 3, 60.00, 120.00, 1),
  ('Spray fijador', 'venta', 'pza', 0, 3, 50.00, 100.00, 1),
  ('Aceite para barba', 'venta', 'pza', 0, 2, 70.00, 140.00, 1),
  ('Navajas desechables', 'uso_diario', 'pza', 0, 20, 3.00, 0, 1),
  ('Gel para corte', 'uso_diario', 'ml', 0, 500, 0.20, 0, 1),
  ('Talco', 'uso_diario', 'g', 0, 300, 0.10, 0, 1),
  ('Alcohol antiseptico', 'uso_diario', 'ml', 0, 500, 0.08, 0, 1);
