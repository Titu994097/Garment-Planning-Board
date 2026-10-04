<?php
declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Response;
use App\Services\Resource;

/** Generic CRUD controller for every registry-defined master (companies, factories, departments …). */
final class ResourceController extends Controller
{
    private function resource(string $key): Resource
    {
        return Resource::find($key) ?? Response::abort(404, 'Unknown module');
    }

    public function index(string $key): void
    {
        $r = $this->resource($key);
        $this->authorize($r->permission('view'));
        $this->view('resource/index', ['r' => $r, 'title' => $r->title]);
    }

    /** DataTables server-side endpoint. */
    public function data(string $key): void
    {
        $r = $this->resource($key);
        $this->authorize($r->permission('view'));
        $cols = array_keys($r->listColumns());
        $orderIdx = (int) ($this->request->input('order')[0]['column'] ?? -1);
        $page = $r->paginate(
            (int) $this->request->input('start', 0),
            (int) $this->request->input('length', 25),
            trim((string) ($this->request->input('search')['value'] ?? '')),
            $cols[$orderIdx] ?? null,
            (string) ($this->request->input('order')[0]['dir'] ?? 'asc'),
            (array) $this->request->input('filter', [])
        );
        $data = array_map(function (array $row) use ($r, $cols) {
            $out = ['id' => (int) $row['id']];
            foreach ($cols as $c) {
                $out[$c] = $r->display($c, $row);
                if ($c === 'status') {
                    $out[$c] = ['value' => $row[$c], 'label' => $out[$c]];
                }
            }
            return $out;
        }, $page['rows']);

        Response::json([
            'draw' => (int) $this->request->input('draw', 0),
            'recordsTotal' => $page['total'],
            'recordsFiltered' => $page['filtered'],
            'data' => $data,
        ]);
    }

    public function create(string $key): void
    {
        $r = $this->resource($key);
        $this->authorize($r->permission('create'));
        $this->view('resource/form', ['r' => $r, 'record' => [], 'title' => 'New ' . $r->title]);
    }

    public function store(string $key): void
    {
        $r = $this->resource($key);
        $this->authorize($r->permission('create'));
        $data = $this->validate($r->rules(), $r->labels());
        $this->guardDb(fn () => $r->create($data));
        $this->success($r->title . ' created successfully.', 'admin/' . $key);
    }

    public function edit(string $key, string $id): void
    {
        $r = $this->resource($key);
        $this->authorize($r->permission('edit'));
        $record = $r->findRecord((int) $id) ?? Response::abort(404, 'Record not found');
        $this->view('resource/form', ['r' => $r, 'record' => $record, 'title' => 'Edit ' . $r->title]);
    }

    public function update(string $key, string $id): void
    {
        $r = $this->resource($key);
        $this->authorize($r->permission('edit'));
        $data = $this->validate($r->rules((int) $id), $r->labels());
        $ok = $this->guardDb(fn () => $r->update((int) $id, $data));
        if (!$ok) {
            Response::abort(404, 'Record not found');
        }
        $this->success($r->title . ' updated successfully.', 'admin/' . $key);
    }

    public function destroy(string $key, string $id): void
    {
        $r = $this->resource($key);
        $this->authorize($r->permission('delete'));
        $ok = $this->guardDb(fn () => $r->delete((int) $id));
        if (!$ok) {
            Response::abort(404, 'Record not found');
        }
        $this->success('Record deleted.', 'admin/' . $key);
    }

    /** CSV export of the current (searched) list. */
    public function export(string $key): void
    {
        $r = $this->resource($key);
        $this->authorize($r->permission('export'));
        $page = $r->paginate(0, 1000, (string) $this->request->input('q', ''));
        $cols = $r->listColumns();

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $key . '-' . date('Ymd-His') . '.csv"');
        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
        fputcsv($out, array_column($cols, 'label'));
        foreach ($page['rows'] as $row) {
            $line = [];
            foreach (array_keys($cols) as $c) {
                $v = $r->display($c, $row);
                // neutralise spreadsheet formula injection
                $line[] = preg_match('/^[=+\-@]/', $v) ? "'" . $v : $v;
            }
            fputcsv($out, $line);
        }
        fclose($out);
        exit;
    }

    /** Translate integrity violations into friendly messages. */
    private function guardDb(callable $fn): mixed
    {
        try {
            return $fn();
        } catch (\PDOException $e) {
            if ($e->getCode() === '23000') {
                $msg = str_contains($e->getMessage(), 'Duplicate')
                    ? 'A record with the same code already exists.'
                    : 'This record is referenced by other data and cannot be changed or removed.';
                if ($this->request->isAjax()) {
                    Response::json(['success' => false, 'message' => $msg], 409);
                }
                \App\Core\Session::flash('error', $msg);
                Response::back();
            }
            throw $e;
        }
    }
}
