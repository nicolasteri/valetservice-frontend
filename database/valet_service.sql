-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Creato il: Lug 27, 2025 alle 12:45
-- Versione del server: 10.4.32-MariaDB
-- Versione PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `valet_service`
--

-- --------------------------------------------------------

--
-- Struttura della tabella `companies`
--

CREATE TABLE `companies` (
  `company_id` int(11) NOT NULL,
  `company_name` varchar(255) NOT NULL,
  `company_code` varchar(20) NOT NULL,
  `manager_code` varchar(20) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dump dei dati per la tabella `companies`
--

INSERT INTO `companies` (`company_id`, `company_name`, `company_code`, `manager_code`) VALUES
(1, 'UNITED VALET', '111222333', '000000000'),
(2, 'TOP DALLAS VALET', '444-555-666', '000000001');

-- --------------------------------------------------------

--
-- Struttura della tabella `customers`
--

CREATE TABLE `customers` (
  `customer_id` int(11) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `vehicle_model` varchar(50) DEFAULT NULL,
  `color` varchar(30) DEFAULT NULL,
  `company_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dump dei dati per la tabella `customers`
--

INSERT INTO `customers` (`customer_id`, `first_name`, `last_name`, `phone_number`, `vehicle_model`, `color`, `company_id`) VALUES
(1, 'Nicola', 'Losito', '9452832280', 'Ford', 'Gold', 1),
(2, 'Mia', 'Mia', '1234567899', 'Nissan kicks', 'Silver', 1),
(3, 'Paoul', 'Walker', '1111111111', 'Mustang', 'Blue', 1),
(4, '2', '', '2222222222', '', '', 1),
(5, '4', '', '4444444444', '', '', 1),
(6, '5', '', '5555555555', '', '', 1),
(7, '6', '', '6666666666', '', '', 2),
(9, '6', '', '6666666666', '', '', 1),
(10, 'Alessandro', 'Steri', '3895297795', 'Jeep', 'Blue Grey', 1),
(11, 'pino', 'piano', '9452832286', 'rari', 'red', 1),
(12, 'aoaoa', 'oaoao', '2342342342', 'punto', 'white', 1),
(13, 'five', 'artie', '5555555554', 'Tesla', 'blue', 1),
(14, 'maz', 'rax', '8989878787', 'benz', 'blk', 1),
(15, 'matteo', 'steri', '7281271819', 'rari', 'red', 1),
(16, 'kkk', 'kjk', '9999999999', 'dacia', 'white', 1),
(17, 'seven', 'savage', '7777777777', 'porche', 'red', 1),
(18, 'ocho', 'pocho', '8888888888', 'punto', 'blue', 1),
(19, 'ben', 'ten', '1000000000', 'mustang', 'green', 1),
(20, 'eleven', 'seven', '1100000000', 'tesla X', 'red', 1),
(21, 'dode', 'ca', '1200000000', 'aston martin', 'blk', 1),
(22, 'Tris', 'Te', '3333333333', 'Tesla', 'gold', 1);

-- --------------------------------------------------------

--
-- Struttura della tabella `locations`
--

CREATE TABLE `locations` (
  `location_id` int(11) NOT NULL,
  `company_id` int(11) NOT NULL,
  `location_name` varchar(255) NOT NULL,
  `location_code` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dump dei dati per la tabella `locations`
--

INSERT INTO `locations` (`location_id`, `company_id`, `location_name`, `location_code`) VALUES
(1, 1, 'Evelyn Steakhouse', '1234'),
(2, 1, 'Big Fish Seafood', '5678'),
(3, 2, 'Casa Mia Italian Grill', '4321'),
(4, 2, 'Rooftop 360', '8765');

-- --------------------------------------------------------

--
-- Struttura della tabella `records`
--

CREATE TABLE `records` (
  `record_id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `status` enum('IN','PENDING','CARE','OUT','OVERNIGHT') DEFAULT 'IN',
  `time_in` datetime DEFAULT current_timestamp(),
  `requested_at` datetime DEFAULT NULL,
  `time_out` datetime DEFAULT NULL,
  `tag_number` int(11) DEFAULT NULL,
  `location_id` int(11) NOT NULL,
  `company_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dump dei dati per la tabella `records`
--

INSERT INTO `records` (`record_id`, `customer_id`, `status`, `time_in`, `requested_at`, `time_out`, `tag_number`, `location_id`, `company_id`) VALUES
(1, 1, 'OUT', '2025-04-19 15:57:00', NULL, '2025-04-19 16:05:18', 1, 1, NULL),
(2, 1, 'OUT', '2025-04-21 23:43:24', NULL, '2025-04-22 00:33:18', 6, 1, NULL),
(3, 2, 'OUT', '2025-04-22 00:32:06', NULL, '2025-04-22 00:33:56', 3, 1, NULL),
(4, 1, 'OUT', '2025-04-22 00:54:14', NULL, '2025-04-22 12:36:09', 6, 1, NULL),
(5, 1, 'OUT', '2025-04-23 01:50:28', NULL, '2025-04-28 01:00:47', 3, 1, NULL),
(6, 2, 'OUT', '2025-04-25 12:39:31', NULL, '2025-04-28 01:00:43', 5, 1, NULL),
(7, 1, 'OUT', '2025-04-28 23:37:46', NULL, '2025-04-28 23:45:34', 10, 1, NULL),
(8, 3, 'OUT', '2025-04-29 23:56:11', NULL, '2025-04-29 23:56:44', 5, 1, NULL),
(9, 3, 'OUT', '2025-04-29 23:56:57', NULL, '2025-04-30 01:53:47', 3, 1, NULL),
(10, 1, 'OUT', '2025-04-30 01:59:33', NULL, '2025-04-30 12:44:38', 2, 1, NULL),
(11, 1, 'OUT', '2025-04-30 13:15:25', NULL, '2025-05-01 01:39:43', 1, 1, NULL),
(12, 3, 'OUT', '2025-04-30 13:15:35', NULL, '2025-05-01 01:39:51', 2, 1, NULL),
(13, 4, 'OUT', '2025-04-30 13:15:50', NULL, '2025-05-05 18:03:02', 3, 1, NULL),
(14, 5, 'OUT', '2025-04-30 13:16:07', NULL, '2025-05-05 18:02:57', 4, 1, NULL),
(15, 6, 'OUT', '2025-04-30 13:16:21', NULL, '2025-05-01 01:41:56', 5, 1, NULL),
(16, 7, 'OUT', '2025-04-30 13:16:33', NULL, '2025-05-05 18:02:52', 6, 1, NULL),
(17, 1, 'OUT', '2025-05-05 18:05:24', NULL, '2025-05-05 18:06:03', 2, 1, NULL),
(19, 3, 'OUT', '2025-05-05 18:34:35', NULL, '2025-05-05 19:25:26', 1, 1, NULL),
(20, 1, 'OUT', '2025-05-05 19:48:15', NULL, '2025-05-05 19:48:28', 3, 1, NULL),
(21, 1, 'OUT', '2025-05-05 19:49:07', NULL, '2025-05-05 20:02:12', 3, 1, NULL),
(22, 1, 'OUT', '2025-05-05 20:02:29', NULL, '2025-05-05 20:02:37', 3, 1, NULL),
(23, 1, 'OUT', '2025-05-05 20:03:49', NULL, '2025-05-05 20:05:59', 4, 1, NULL),
(24, 1, 'OUT', '2025-05-06 00:21:06', NULL, '2025-05-06 00:21:34', 2, 1, NULL),
(25, 1, 'OUT', '2025-05-06 00:21:48', NULL, '2025-05-06 00:27:14', 5, 1, NULL),
(26, 1, 'OUT', '2025-05-06 00:45:01', NULL, '2025-05-06 02:55:18', 4, 1, NULL),
(27, 1, 'OUT', '2025-05-08 04:00:18', NULL, '2025-05-08 04:02:34', 3, 1, NULL),
(29, 6, 'OUT', '2025-05-08 04:38:00', NULL, '2025-06-17 15:40:39', 2, 1, NULL),
(30, 5, 'OUT', '2025-05-08 04:38:44', NULL, '2025-06-17 15:40:44', 1, 1, NULL),
(31, 9, 'OUT', '2025-05-08 04:41:47', NULL, '2025-06-17 15:40:32', 7, 1, NULL),
(33, 1, 'OUT', '2025-06-17 15:40:23', NULL, '2025-06-18 03:31:31', 1, 1, NULL),
(34, 10, 'OUT', '2025-06-18 03:30:07', NULL, '2025-06-18 03:33:36', 8, 1, NULL),
(35, 1, 'OUT', '2025-06-18 03:34:26', NULL, '2025-06-18 03:35:36', 3, 2, NULL),
(36, 10, 'OUT', '2025-06-18 03:45:58', NULL, '2025-06-04 06:54:11', 8, 1, NULL),
(37, 11, 'OUT', '2025-06-19 04:50:47', NULL, '2025-06-20 06:36:24', 2, 1, 1),
(38, 12, 'OUT', '2025-06-19 05:12:23', NULL, '2025-06-20 06:36:18', 1, 1, 1),
(39, 3, 'OUT', '2025-06-19 15:32:42', NULL, '2025-06-20 06:36:45', 3, 1, 1),
(40, 5, 'OUT', '2025-06-20 03:07:08', NULL, '2025-06-20 06:36:49', 4, 1, 1),
(41, 13, 'OUT', '2025-06-20 03:07:37', NULL, '2025-06-20 07:17:07', 5, 1, 1),
(42, 14, 'OUT', '2025-06-20 06:53:08', NULL, '2025-06-20 07:18:11', 1, 1, 1),
(43, 1, 'OUT', '2025-06-20 08:28:48', NULL, '2025-06-21 05:43:50', 2, 1, 1),
(44, 4, 'OUT', '2025-06-21 05:41:00', NULL, '2025-06-22 04:00:42', 1, 1, 1),
(45, 5, 'OUT', '2025-06-21 05:41:23', NULL, '2025-06-21 05:43:59', 3, 1, 1),
(46, 6, 'OUT', '2025-06-21 05:41:36', NULL, '2025-06-21 05:59:04', 4, 1, 1),
(47, 6, 'OUT', '2025-06-23 04:20:17', NULL, '2025-06-23 04:20:25', 8, 1, 1),
(48, 5, 'OUT', '2025-06-23 05:40:10', NULL, '2025-06-23 05:40:34', 6, 1, 1),
(49, 1, 'OUT', '2025-06-24 01:39:44', NULL, '2025-06-25 02:23:26', 1, 1, 1),
(50, 5, 'OUT', '2025-06-24 03:29:07', NULL, '2025-06-25 02:23:10', 2, 1, 1),
(51, 2, 'OUT', '2025-06-24 11:16:52', NULL, '2025-06-26 14:49:04', 3, 1, 1),
(52, 15, 'OUT', '2025-06-24 11:18:21', NULL, '2025-06-24 11:21:11', 4, 1, 1),
(53, 1, 'OUT', '2025-06-24 11:20:40', NULL, '2025-06-25 02:23:15', 5, 1, 1),
(54, 16, 'OUT', '2025-06-25 02:22:07', NULL, '2025-07-03 06:56:10', 5, 2, 1),
(55, 1, 'OUT', '2025-06-25 05:04:17', NULL, '2025-06-27 05:12:52', 2, 1, 1),
(56, 3, 'OUT', '2025-06-26 05:09:12', NULL, '2025-06-26 12:25:05', 1, 1, 1),
(57, 4, 'OUT', '2025-06-26 05:09:29', NULL, '2025-06-26 12:25:44', 4, 1, 1),
(58, 6, 'OUT', '2025-06-26 05:09:41', NULL, '2025-06-26 12:25:18', 5, 1, 1),
(59, 9, 'OUT', '2025-06-26 05:09:53', NULL, '2025-06-26 12:25:23', 6, 1, 1),
(60, 17, 'OUT', '2025-06-26 05:10:14', NULL, '2025-06-27 03:07:32', 7, 1, 1),
(61, 18, 'OUT', '2025-06-26 05:10:51', NULL, '2025-06-26 12:28:56', 8, 1, 1),
(62, 16, 'OUT', '2025-06-26 05:11:02', NULL, '2025-07-03 06:41:37', 9, 1, 1),
(63, 19, 'OUT', '2025-06-26 05:11:54', NULL, '2025-07-03 06:41:41', 10, 1, 1),
(64, 20, 'OUT', '2025-06-26 05:12:54', NULL, '2025-07-03 06:41:45', 11, 1, 1),
(65, 21, 'OUT', '2025-06-26 05:14:58', NULL, '2025-06-27 03:07:38', 12, 1, 1),
(66, 22, 'OUT', '2025-06-27 03:13:31', NULL, '2025-07-03 06:41:51', 3, 1, 1),
(67, 22, 'OUT', '2025-07-03 09:09:01', '2025-07-03 11:13:38', '2025-07-04 03:11:24', 3, 1, 1),
(68, 6, 'OUT', '2025-07-03 10:33:06', NULL, '2025-07-04 03:11:29', 5, 1, 1),
(69, 9, 'OUT', '2025-07-03 10:37:04', NULL, '2025-07-04 06:11:22', 6, 1, 1),
(70, 17, 'OUT', '2025-07-03 10:37:23', '2025-07-04 03:10:09', '2025-07-04 03:11:15', 7, 1, 1),
(71, 18, 'OUT', '2025-07-03 10:37:31', '2025-07-03 11:03:58', '2025-07-04 03:11:19', 8, 1, 1),
(72, 16, 'OUT', '2025-07-03 10:37:39', '2025-07-03 10:38:05', '2025-07-04 03:11:06', 9, 1, 1),
(73, 19, 'OUT', '2025-07-03 10:37:53', NULL, '2025-07-04 03:11:11', 10, 1, 1),
(74, 17, 'OUT', '2025-07-04 04:05:21', '2025-07-04 04:21:13', '2025-07-04 06:11:27', 7, 1, 1),
(75, 18, 'OUT', '2025-07-04 04:05:39', '2025-07-04 04:22:09', '2025-07-04 06:11:31', 8, 1, 1),
(76, 16, 'OUT', '2025-07-04 04:05:47', NULL, '2025-07-04 06:11:35', 9, 1, 1),
(77, 19, 'OUT', '2025-07-04 04:06:00', '2025-07-04 04:21:39', '2025-07-05 05:01:22', 10, 1, 1),
(78, 5, 'OUT', '2025-07-04 06:12:14', '2025-07-05 02:09:56', '2025-07-05 02:10:37', 4, 1, 1),
(79, 6, 'OUT', '2025-07-04 06:12:23', '2025-07-05 02:10:16', '2025-07-05 05:01:26', 5, 1, 1),
(80, 9, 'OUT', '2025-07-04 06:12:30', '2025-07-05 03:42:03', '2025-07-05 05:01:30', 6, 1, 1),
(81, 17, 'OUT', '2025-07-05 03:42:29', '2025-07-05 03:42:37', '2025-07-05 05:01:34', 7, 1, 1),
(82, 18, 'OUT', '2025-07-05 03:49:44', '2025-07-05 03:49:54', '2025-07-05 05:01:38', 8, 1, 1),
(83, 16, 'OUT', '2025-07-05 03:50:03', '2025-07-05 03:50:23', '2025-07-05 05:01:41', 9, 1, 1),
(84, 22, 'OUT', '2025-07-05 05:01:51', '2025-07-05 05:20:02', '2025-07-11 03:37:46', 3, 1, 1),
(85, 5, 'OUT', '2025-07-05 05:02:16', '2025-07-06 04:36:56', '2025-07-11 03:37:51', 4, 1, 1),
(86, 6, 'OUT', '2025-07-05 05:09:29', NULL, '2025-07-11 03:37:54', 5, 1, 1);

-- --------------------------------------------------------

--
-- Struttura della tabella `tags`
--

CREATE TABLE `tags` (
  `id` int(11) NOT NULL,
  `tag_number` int(11) NOT NULL,
  `status` enum('AVAILABLE','IN','PENDING','CARE','OUT','OVERNIGHT') DEFAULT 'AVAILABLE',
  `customer_id` int(11) DEFAULT NULL,
  `location_id` int(11) NOT NULL,
  `company_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dump dei dati per la tabella `tags`
--

INSERT INTO `tags` (`id`, `tag_number`, `status`, `customer_id`, `location_id`, `company_id`) VALUES
(1, 1, 'AVAILABLE', NULL, 1, 1),
(2, 2, 'AVAILABLE', NULL, 1, 1),
(3, 3, 'AVAILABLE', NULL, 1, 1),
(4, 4, 'AVAILABLE', NULL, 1, 1),
(5, 5, 'AVAILABLE', NULL, 1, 1),
(6, 6, 'AVAILABLE', NULL, 1, 1),
(7, 7, 'AVAILABLE', NULL, 1, 1),
(8, 8, 'AVAILABLE', NULL, 1, 1),
(9, 9, 'AVAILABLE', NULL, 1, 1),
(10, 10, 'AVAILABLE', NULL, 1, 1),
(11, 11, 'AVAILABLE', NULL, 1, 1),
(12, 12, 'AVAILABLE', NULL, 1, 1),
(13, 13, 'AVAILABLE', NULL, 1, 1),
(14, 14, 'AVAILABLE', NULL, 1, 1),
(15, 15, 'AVAILABLE', NULL, 1, 1),
(16, 16, 'AVAILABLE', NULL, 1, 1),
(17, 17, 'AVAILABLE', NULL, 1, 1),
(18, 18, 'AVAILABLE', NULL, 1, 1),
(19, 19, 'AVAILABLE', NULL, 1, 1),
(20, 20, 'AVAILABLE', NULL, 1, 1),
(21, 21, 'AVAILABLE', NULL, 1, 1),
(22, 22, 'AVAILABLE', NULL, 1, 1),
(23, 23, 'AVAILABLE', NULL, 1, 1),
(24, 24, 'AVAILABLE', NULL, 1, 1),
(25, 25, 'AVAILABLE', NULL, 1, 1),
(26, 26, 'AVAILABLE', NULL, 1, 1),
(27, 27, 'AVAILABLE', NULL, 1, 1),
(28, 28, 'AVAILABLE', NULL, 1, 1),
(29, 29, 'AVAILABLE', NULL, 1, 1),
(30, 30, 'AVAILABLE', NULL, 1, 1),
(31, 31, 'AVAILABLE', NULL, 1, 1),
(32, 32, 'AVAILABLE', NULL, 1, 1),
(33, 33, 'AVAILABLE', NULL, 1, 1),
(34, 34, 'AVAILABLE', NULL, 1, 1),
(35, 35, 'AVAILABLE', NULL, 1, 1),
(36, 36, 'AVAILABLE', NULL, 1, 1),
(37, 37, 'AVAILABLE', NULL, 1, 1),
(38, 38, 'AVAILABLE', NULL, 1, 1),
(39, 39, 'AVAILABLE', NULL, 1, 1),
(40, 40, 'AVAILABLE', NULL, 1, 1),
(41, 41, 'AVAILABLE', NULL, 1, 1),
(42, 42, 'AVAILABLE', NULL, 1, 1),
(43, 43, 'AVAILABLE', NULL, 1, 1),
(44, 44, 'AVAILABLE', NULL, 1, 1),
(45, 45, 'AVAILABLE', NULL, 1, 1),
(46, 46, 'AVAILABLE', NULL, 1, 1),
(47, 47, 'AVAILABLE', NULL, 1, 1),
(48, 48, 'AVAILABLE', NULL, 1, 1),
(49, 49, 'AVAILABLE', NULL, 1, 1),
(50, 50, 'AVAILABLE', NULL, 1, 1),
(51, 51, 'AVAILABLE', NULL, 1, 1),
(52, 52, 'AVAILABLE', NULL, 1, 1),
(53, 53, 'AVAILABLE', NULL, 1, 1),
(54, 54, 'AVAILABLE', NULL, 1, 1),
(55, 55, 'AVAILABLE', NULL, 1, 1),
(56, 56, 'AVAILABLE', NULL, 1, 1),
(57, 57, 'AVAILABLE', NULL, 1, 1),
(58, 58, 'AVAILABLE', NULL, 1, 1),
(59, 59, 'AVAILABLE', NULL, 1, 1),
(60, 60, 'AVAILABLE', NULL, 1, 1),
(61, 61, 'AVAILABLE', NULL, 1, 1),
(62, 62, 'AVAILABLE', NULL, 1, 1),
(63, 63, 'AVAILABLE', NULL, 1, 1),
(64, 64, 'AVAILABLE', NULL, 1, 1),
(65, 65, 'AVAILABLE', NULL, 1, 1),
(66, 66, 'AVAILABLE', NULL, 1, 1),
(67, 67, 'AVAILABLE', NULL, 1, 1),
(68, 68, 'AVAILABLE', NULL, 1, 1),
(69, 69, 'AVAILABLE', NULL, 1, 1),
(70, 70, 'AVAILABLE', NULL, 1, 1),
(71, 71, 'AVAILABLE', NULL, 1, 1),
(72, 72, 'AVAILABLE', NULL, 1, 1),
(73, 73, 'AVAILABLE', NULL, 1, 1),
(74, 74, 'AVAILABLE', NULL, 1, 1),
(75, 75, 'AVAILABLE', NULL, 1, 1),
(76, 76, 'AVAILABLE', NULL, 1, 1),
(77, 77, 'AVAILABLE', NULL, 1, 1),
(78, 78, 'AVAILABLE', NULL, 1, 1),
(79, 79, 'AVAILABLE', NULL, 1, 1),
(80, 80, 'AVAILABLE', NULL, 1, 1),
(81, 81, 'AVAILABLE', NULL, 1, 1),
(82, 82, 'AVAILABLE', NULL, 1, 1),
(83, 83, 'AVAILABLE', NULL, 1, 1),
(84, 84, 'AVAILABLE', NULL, 1, 1),
(85, 85, 'AVAILABLE', NULL, 1, 1),
(86, 86, 'AVAILABLE', NULL, 1, 1),
(87, 87, 'AVAILABLE', NULL, 1, 1),
(88, 88, 'AVAILABLE', NULL, 1, 1),
(89, 89, 'AVAILABLE', NULL, 1, 1),
(90, 90, 'AVAILABLE', NULL, 1, 1),
(91, 91, 'AVAILABLE', NULL, 1, 1),
(92, 92, 'AVAILABLE', NULL, 1, 1),
(93, 93, 'AVAILABLE', NULL, 1, 1),
(94, 94, 'AVAILABLE', NULL, 1, 1),
(95, 95, 'AVAILABLE', NULL, 1, 1),
(96, 96, 'AVAILABLE', NULL, 1, 1),
(97, 97, 'AVAILABLE', NULL, 1, 1),
(98, 98, 'AVAILABLE', NULL, 1, 1),
(99, 99, 'AVAILABLE', NULL, 1, 1),
(100, 100, 'AVAILABLE', NULL, 1, 1),
(101, 1, 'AVAILABLE', NULL, 2, 1),
(102, 2, 'AVAILABLE', NULL, 2, 1),
(103, 3, 'AVAILABLE', NULL, 2, 1),
(104, 4, 'AVAILABLE', NULL, 2, 1),
(105, 5, 'AVAILABLE', NULL, 2, 1),
(106, 6, 'AVAILABLE', NULL, 2, 1),
(107, 7, 'AVAILABLE', NULL, 2, 1),
(108, 8, 'AVAILABLE', NULL, 2, 1),
(109, 9, 'AVAILABLE', NULL, 2, 1),
(110, 10, 'AVAILABLE', NULL, 2, 1),
(111, 11, 'AVAILABLE', NULL, 2, 1),
(112, 12, 'AVAILABLE', NULL, 2, 1),
(113, 13, 'AVAILABLE', NULL, 2, 1),
(114, 14, 'AVAILABLE', NULL, 2, 1),
(115, 15, 'AVAILABLE', NULL, 2, 1),
(116, 16, 'AVAILABLE', NULL, 2, 1),
(117, 17, 'AVAILABLE', NULL, 2, 1),
(118, 18, 'AVAILABLE', NULL, 2, 1),
(119, 19, 'AVAILABLE', NULL, 2, 1),
(120, 20, 'AVAILABLE', NULL, 2, 1),
(121, 21, 'AVAILABLE', NULL, 2, 1),
(122, 22, 'AVAILABLE', NULL, 2, 1),
(123, 23, 'AVAILABLE', NULL, 2, 1),
(124, 24, 'AVAILABLE', NULL, 2, 1),
(125, 25, 'AVAILABLE', NULL, 2, 1),
(126, 26, 'AVAILABLE', NULL, 2, 1),
(127, 27, 'AVAILABLE', NULL, 2, 1),
(128, 28, 'AVAILABLE', NULL, 2, 1),
(129, 29, 'AVAILABLE', NULL, 2, 1),
(130, 30, 'AVAILABLE', NULL, 2, 1),
(131, 31, 'AVAILABLE', NULL, 2, 1),
(132, 32, 'AVAILABLE', NULL, 2, 1),
(133, 33, 'AVAILABLE', NULL, 2, 1),
(134, 34, 'AVAILABLE', NULL, 2, 1),
(135, 35, 'AVAILABLE', NULL, 2, 1),
(136, 36, 'AVAILABLE', NULL, 2, 1),
(137, 37, 'AVAILABLE', NULL, 2, 1),
(138, 38, 'AVAILABLE', NULL, 2, 1),
(139, 39, 'AVAILABLE', NULL, 2, 1),
(140, 40, 'AVAILABLE', NULL, 2, 1),
(141, 41, 'AVAILABLE', NULL, 2, 1),
(142, 42, 'AVAILABLE', NULL, 2, 1),
(143, 43, 'AVAILABLE', NULL, 2, 1),
(144, 44, 'AVAILABLE', NULL, 2, 1),
(145, 45, 'AVAILABLE', NULL, 2, 1),
(146, 46, 'AVAILABLE', NULL, 2, 1),
(147, 47, 'AVAILABLE', NULL, 2, 1),
(148, 48, 'AVAILABLE', NULL, 2, 1),
(149, 49, 'AVAILABLE', NULL, 2, 1),
(150, 50, 'AVAILABLE', NULL, 2, 1),
(151, 51, 'AVAILABLE', NULL, 2, 1),
(152, 52, 'AVAILABLE', NULL, 2, 1),
(153, 53, 'AVAILABLE', NULL, 2, 1),
(154, 54, 'AVAILABLE', NULL, 2, 1),
(155, 55, 'AVAILABLE', NULL, 2, 1),
(156, 56, 'AVAILABLE', NULL, 2, 1),
(157, 57, 'AVAILABLE', NULL, 2, 1),
(158, 58, 'AVAILABLE', NULL, 2, 1),
(159, 59, 'AVAILABLE', NULL, 2, 1),
(160, 60, 'AVAILABLE', NULL, 2, 1),
(161, 61, 'AVAILABLE', NULL, 2, 1),
(162, 62, 'AVAILABLE', NULL, 2, 1),
(163, 63, 'AVAILABLE', NULL, 2, 1),
(164, 64, 'AVAILABLE', NULL, 2, 1),
(165, 65, 'AVAILABLE', NULL, 2, 1),
(166, 66, 'AVAILABLE', NULL, 2, 1),
(167, 67, 'AVAILABLE', NULL, 2, 1),
(168, 68, 'AVAILABLE', NULL, 2, 1),
(169, 69, 'AVAILABLE', NULL, 2, 1),
(170, 70, 'AVAILABLE', NULL, 2, 1),
(171, 71, 'AVAILABLE', NULL, 2, 1),
(172, 72, 'AVAILABLE', NULL, 2, 1),
(173, 73, 'AVAILABLE', NULL, 2, 1),
(174, 74, 'AVAILABLE', NULL, 2, 1),
(175, 75, 'AVAILABLE', NULL, 2, 1),
(176, 76, 'AVAILABLE', NULL, 2, 1),
(177, 77, 'AVAILABLE', NULL, 2, 1),
(178, 78, 'AVAILABLE', NULL, 2, 1),
(179, 79, 'AVAILABLE', NULL, 2, 1),
(180, 80, 'AVAILABLE', NULL, 2, 1),
(181, 81, 'AVAILABLE', NULL, 2, 1),
(182, 82, 'AVAILABLE', NULL, 2, 1),
(183, 83, 'AVAILABLE', NULL, 2, 1),
(184, 84, 'AVAILABLE', NULL, 2, 1),
(185, 85, 'AVAILABLE', NULL, 2, 1),
(186, 86, 'AVAILABLE', NULL, 2, 1),
(187, 87, 'AVAILABLE', NULL, 2, 1),
(188, 88, 'AVAILABLE', NULL, 2, 1),
(189, 89, 'AVAILABLE', NULL, 2, 1),
(190, 90, 'AVAILABLE', NULL, 2, 1),
(191, 91, 'AVAILABLE', NULL, 2, 1),
(192, 92, 'AVAILABLE', NULL, 2, 1),
(193, 93, 'AVAILABLE', NULL, 2, 1),
(194, 94, 'AVAILABLE', NULL, 2, 1),
(195, 95, 'AVAILABLE', NULL, 2, 1),
(196, 96, 'AVAILABLE', NULL, 2, 1),
(197, 97, 'AVAILABLE', NULL, 2, 1),
(198, 98, 'AVAILABLE', NULL, 2, 1),
(199, 99, 'AVAILABLE', NULL, 2, 1),
(200, 100, 'AVAILABLE', NULL, 2, 1);

--
-- Indici per le tabelle scaricate
--

--
-- Indici per le tabelle `companies`
--
ALTER TABLE `companies`
  ADD PRIMARY KEY (`company_id`),
  ADD UNIQUE KEY `company_code` (`company_code`),
  ADD UNIQUE KEY `manager_code` (`manager_code`);

--
-- Indici per le tabelle `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`customer_id`),
  ADD KEY `fk_customers_company` (`company_id`);

--
-- Indici per le tabelle `locations`
--
ALTER TABLE `locations`
  ADD PRIMARY KEY (`location_id`),
  ADD UNIQUE KEY `location_code` (`location_code`),
  ADD KEY `company_id` (`company_id`);

--
-- Indici per le tabelle `records`
--
ALTER TABLE `records`
  ADD PRIMARY KEY (`record_id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `fk_records_location` (`location_id`),
  ADD KEY `fk_records_company` (`company_id`);

--
-- Indici per le tabelle `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `fk_tags_location` (`location_id`),
  ADD KEY `fk_tags_company` (`company_id`);

--
-- AUTO_INCREMENT per le tabelle scaricate
--

--
-- AUTO_INCREMENT per la tabella `companies`
--
ALTER TABLE `companies`
  MODIFY `company_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT per la tabella `customers`
--
ALTER TABLE `customers`
  MODIFY `customer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT per la tabella `locations`
--
ALTER TABLE `locations`
  MODIFY `location_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT per la tabella `records`
--
ALTER TABLE `records`
  MODIFY `record_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

--
-- AUTO_INCREMENT per la tabella `tags`
--
ALTER TABLE `tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=201;

--
-- Limiti per le tabelle scaricate
--

--
-- Limiti per la tabella `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE;

--
-- Limiti per la tabella `locations`
--
ALTER TABLE `locations`
  ADD CONSTRAINT `locations_ibfk_1` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE;

--
-- Limiti per la tabella `records`
--
ALTER TABLE `records`
  ADD CONSTRAINT `fk_records_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_records_location` FOREIGN KEY (`location_id`) REFERENCES `locations` (`location_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `records_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
