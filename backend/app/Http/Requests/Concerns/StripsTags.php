<?php

namespace App\Http\Requests\Concerns;

/**
 * Removes HTML tags from free-text fields before validation (stored XSS protection
 * for names and addresses). Output is escaped again by the frontend.
 */
trait StripsTags
{
    /** @param  list<string>  $fields */
    protected function stripTagsFrom(array $fields): void
    {
        $clean = [];

        foreach ($fields as $field) {
            $value = $this->input($field);

            if (is_string($value)) {
                $clean[$field] = trim(strip_tags($value));
            }
        }

        $this->merge($clean);
    }
}
