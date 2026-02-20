<?php
declare(strict_types=1);

namespace OCA\PerfAvion\Controller;

use OCA\PerfAvion\AppInfo\Application;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IGroupManager;
use OCP\IRequest;
use OCP\IUserSession;
use OCP\Util;

class PageController extends Controller {

    public function __construct(
        IRequest      $request,
        private IUserSession  $userSession,
        private IGroupManager $groupManager
    ) {
        parent::__construct(Application::APP_ID, $request);
    }

    /**
     * @NoAdminRequired
     * @NoCSRFRequired
     */
    public function index(): TemplateResponse {
        Util::addScript(Application::APP_ID, 'perfavion-main');
        Util::addStyle(Application::APP_ID,  'perfavion-style');

        $user    = $this->userSession->getUser();
        $isAdmin = $user !== null
            && $this->groupManager->isAdmin($user->getUID());

        return new TemplateResponse(Application::APP_ID, 'main', [
            'isAdmin' => $isAdmin,
        ]);
    }
}
