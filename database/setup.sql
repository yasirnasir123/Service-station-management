-- Run with an administrative MySQL client. Change passwords locally.
CREATE DATABASE service_station CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'station_migrator'@'localhost' IDENTIFIED BY 'REPLACE_MIGRATOR_PASSWORD';
GRANT CREATE, ALTER, INDEX, REFERENCES, SELECT, INSERT, UPDATE ON service_station.* TO 'station_migrator'@'localhost';
CREATE USER 'station_app'@'localhost' IDENTIFIED BY 'REPLACE_APP_PASSWORD';
GRANT SELECT, INSERT, UPDATE ON service_station.* TO 'station_app'@'localhost';
-- No DELETE or DDL privileges for the runtime account. Match host to DB_HOST.
