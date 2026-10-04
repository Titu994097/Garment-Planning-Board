<?php
declare(strict_types=1);

namespace App\Services;

use App\Core\Database;

/** Splits a fiscal year into monthly accounting periods (idempotent while periods are open). */
final class FiscalPeriodGenerator
{
    public static function generate(int $fiscalYearId): void
    {
        $fy = Database::fetch('SELECT * FROM fiscal_years WHERE id = ?', [$fiscalYearId]);
        if (!$fy) {
            return;
        }
        $closed = (int) Database::value("SELECT COUNT(*) FROM fiscal_periods WHERE fiscal_year_id = ? AND status = 'closed'", [$fiscalYearId]);
        if ($closed > 0) {
            return; // never rewrite periods once any is closed
        }
        Database::query('DELETE FROM fiscal_periods WHERE fiscal_year_id = ?', [$fiscalYearId]);

        $cursor = new \DateTimeImmutable($fy['start_date']);
        $end = new \DateTimeImmutable($fy['end_date']);
        $n = 1;
        while ($cursor <= $end && $n <= 24) {
            $periodEnd = $cursor->modify('last day of this month');
            if ($periodEnd > $end) {
                $periodEnd = $end;
            }
            Database::insert('fiscal_periods', [
                'fiscal_year_id' => $fiscalYearId,
                'period_no' => $n,
                'name' => $cursor->format('M Y'),
                'start_date' => $cursor->format('Y-m-d'),
                'end_date' => $periodEnd->format('Y-m-d'),
            ]);
            $cursor = $periodEnd->modify('+1 day');
            $n++;
        }
    }
}
