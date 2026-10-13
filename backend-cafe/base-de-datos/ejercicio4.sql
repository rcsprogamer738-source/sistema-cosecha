CREATE TABLE lecturas_sensores (
    id SERIAL PRIMARY KEY, -- Usar AUTO_INCREMENT en MySQL
    identificador_equipo VARCHAR(50) NOT NULL,
    tipo_sensor VARCHAR(50) NOT NULL,
    valor_lectura DECIMAL(10, 2) NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices de optimización
CREATE INDEX idx_tipo_sensor ON lecturas_sensores(tipo_sensor);
CREATE INDEX idx_estado ON lecturas_sensores(estado);
CREATE INDEX idx_fecha_registro ON lecturas_sensores(fecha_registro);

