<?php

/*********************************************************************
  SHA1 hash of the info page password, the preset password is the
  empty string. You might change it to keep this information private.
  Online hash generator: http://www.sha1.cz/
*********************************************************************/
define("PASSHASH", "9fd8de5fc2a7c2c0d469b2fff1afde4e5def37ba");

function normalized_require_once($lib) {
    require_once(preg_replace("#[\\\\/]+#", "/", dirname(__FILE__) . "/inc/${lib}.php"));
}

function __autoload($class_name) {
    normalized_require_once("class-" . strtolower($class_name));
}

Bootstrap::run();
