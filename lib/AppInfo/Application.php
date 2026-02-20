<?php

declare(strict_types=1);

namespace OCA\PerfAvion\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;


class Application extends App implements IBootstrap {

    public const APP_ID = 'perfavion';

    public function __construct() {
        parent::__construct(self::APP_ID);
    }

    public function register(IRegistrationContext $context): void {
        // Register services here
    }
    public function boot(IBootContext $context): void {
        // Perform boot actions here
    }
}
