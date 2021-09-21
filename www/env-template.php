<?php
# copy this file to env.php and edit the path to the zbrowser database, as needed:
$db = new SQLite3('zbrowser.db', SQLITE3_OPEN_READONLY);

# hard coded apertures for zchecker 2.7.0
$apertures = array(
    2, 3, 4, 5, 7, 9, 11, 15, 20,
    5000, 10000, 15000, 20000, 30000, 40000);
$unpack = 'f15';

?>
