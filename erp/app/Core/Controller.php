<?php
declare(strict_types=1);

namespace App\Core;

abstract class Controller
{
    public function __construct(protected Request $request)
    {
    }

    protected function view(string $view, array $data = [], string $layout = 'main'): void
    {
        View::render($view, $data, $layout);
    }

    protected function authorize(string $permission): void
    {
        if (!Auth::can($permission)) {
            Response::abort(403, 'You do not have permission to perform this action.');
        }
    }

    /** Validate input; on failure redirect back with errors (web) or return 422 (ajax). */
    protected function validate(array $rules, array $labels = []): array
    {
        $data = $this->request->all();
        $v = Validator::make($data, $rules, $labels);
        if ($v->fails()) {
            if ($this->request->isAjax()) {
                Response::json(['success' => false, 'message' => 'Validation failed', 'errors' => $v->errors()], 422);
            }
            $_SESSION['_errors'] = $v->errors();
            $_SESSION['_old'] = array_diff_key($data, array_flip(['password', 'password_confirmation', '_token']));
            Response::back();
        }
        unset($_SESSION['_errors'], $_SESSION['_old']);
        return array_intersect_key($data, $rules);
    }

    protected function success(string $message, string $redirect): never
    {
        if ($this->request->isAjax()) {
            Response::json(['success' => true, 'message' => $message, 'redirect' => url($redirect)]);
        }
        Session::flash('success', $message);
        Response::redirect($redirect);
    }
}
