CREATE DATABASE IF NOT EXISTS controtrack
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE DATABASE IF NOT EXISTS controtrack_payment
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON controtrack.* TO 'controtrack'@'%';
GRANT ALL PRIVILEGES ON controtrack_payment.* TO 'controtrack'@'%';

FLUSH PRIVILEGES;
