<?php

declare(strict_types=1);

namespace OCA\PerfAvion\Controller;

use OCA\PerfAvion\AppInfo\Application;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;
use OCP\Util;


class PageController extends Controller {

    public function __construct(
        IRequest $request
    ) {
        parent::__construct(Application::APP_ID, $request);
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        Util::addScript(Application::APP_ID, 'perfavion-main');
        Util::addStyle(Application::APP_ID, 'perfavion-style');

        return new TemplateResponse(Application::APP_ID, 'main');
    }
}
