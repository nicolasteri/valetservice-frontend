-- Active: 1743449117610@@127.0.0.1@3306@valet_service
--CREATE DATABASE ;
--CREATE DATABASE valet_service;

/*
-- Tabella clienti
CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    vehicle_model VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

ALTER TABLE customers ADD COLUMN color VARCHAR(30);


);

-- Tabella NFC Tags
CREATE TABLE nfc_tags (
    tag_number INT PRIMARY KEY, -- Numero fisico del tag (000-999)
    status ENUM('IN', 'PENDING', 'OUT') DEFAULT NULL
);

-- Tabella richieste (collega clienti e tag NFC)
CREATE TABLE requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    tag_number INT NOT NULL,
    status ENUM('IN', 'PENDING', 'OUT') NOT NULL DEFAULT 'IN',
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_time TIMESTAMP NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (tag_number) REFERENCES nfc_tags(tag_number)
);

-- Add AVAILABLE to nfc_tags Table
ALTER TABLE nfc_tags 
MODIFY COLUMN status ENUM('AVAILABLE', 'IN', 'PENDING', 'OUT') DEFAULT 'AVAILABLE';




-- Query per Registrazione Cliente e Assegnazione Tag NFC

INSERT INTO customers (first_name, last_name, phone_number, vehicle_model, color) 
VALUES ('John', 'Doe', '1234567890', 'Toyota Camry', 'Black');


-- Cambiamo il valore del Tag NFC da 'AVAILABLE' a 'IN' e lo associamo al cliente appena registrato
UPDATE nfc_tags 
SET status = 'IN' 
WHERE tag_number = 10 AND status = 'AVAILABLE';

INSERT INTO requests (customer_id, tag_number) 
VALUES (LAST_INSERT_ID(), 10);

-- Aggiungiamo il campo tag_number per memorizzare il numero del tag NFC associato al cliente.
ALTER TABLE customers
ADD COLUMN tag_number INT;

-- Aggiungiamo il campo customer_id per mantenere il collegamento tra i tag NFC e i clienti.

ALTER TABLE nfc_tags
ADD COLUMN customer_id INT,
ADD CONSTRAINT fk_customer
  FOREIGN KEY (customer_id) 
  REFERENCES customers(customer_id)
  ON DELETE SET NULL;  -- Manteniamo la possibilità di dissociare il cliente senza eliminare il record


-- Aggiungiamo il campo status alla tabella customers per tracciare lo stato del cliente (IN, PENDING, OUT).

ALTER TABLE customers
ADD COLUMN status ENUM('IN', 'PENDING', 'OUT') DEFAULT 'IN'; -- Stato predefinito = 'IN'

-- Creo un Tag n.7
INSERT INTO nfc_tags (tag_number, status)
VALUES (7, 'AVAILABLE');

ALTER TABLE nfc_tags MODIFY status ENUM('AVAILABLE', 'IN', 'PENDING', 'CARE') NOT NULL;

ALTER TABLE customers MODIFY status ENUM('IN', 'PENDING', 'CARE', 'OUT') NOT NULL;



*/
--creiamo 100 tag NFC
INSERT INTO tags (tag_number, status)
SELECT LPAD(n, 3, '0'), 'AVAILABLE'
FROM (SELECT ROW_NUMBER() OVER () AS n FROM information_schema.tables LIMIT 100) AS numbers;


USE valet_service;

-- INSERIMENTO NEW CUSTOMER
INSERT INTO customers (first_name, last_name, phone_number, vehicle_model, color, tag_number) 
VALUES ('Nico', 'Steri', '123456789', 'Ford', 'Gold', 3);

-- Prelevare l'ID del cliente e il tag_number appena inserito
SET @customer_id = LAST_INSERT_ID();

-- Associare il customer_id al tag_number nella tabella nfc_tags
UPDATE nfc_tags 
SET customer_id = @customer_id, status = 'IN'
WHERE tag_number = 3;  -- Tag number che l'operatore ha scelto

-- RICHIESTA VEICOLO
UPDATE nfc_tags 
SET status = 'PENDING' 
WHERE customer_id = @customer_id;

UPDATE customers
SET status = 'PENDING' 
WHERE customer_id = @customer_id;

-- OPERATORE PRENDE IN CARICO LA RICHIESTA
UPDATE nfc_tags 
SET status = 'CARE' 
WHERE customer_id = @customer_id;

UPDATE customers 
SET status = 'CARE' 
WHERE customer_id = @customer_id;

-- CHECKOUT CUSTOMER
UPDATE nfc_tags 
SET status = 'AVAILABLE', customer_id = NULL 
WHERE customer_id = @customer_id;

UPDATE customers
SET status = 'OUT' 
WHERE customer_id = @customer_id;