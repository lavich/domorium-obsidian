## ADDED Requirements

### Requirement: A couple is named with the marriage sign

Wherever the plugin names a family by its spouses — the title of its card, a row of the list, the tooltip and the accessible name of its node in the graph, a command that lists it — it SHALL write the two names joined by ` ⚭ `, in every language, and not with a word. A family with one spouse SHALL be named by that spouse alone, and one with none as having no spouses, as it is today.

#### Scenario: The Curies
- **WHEN** the card of the family of Pierre and Marie is shown for `curie.ged`
- **THEN** its title reads `Pierre Curie ⚭ Marie Skłodowska-Curie`

#### Scenario: In Russian
- **WHEN** the language of the plugin is Russian and the same card is shown
- **THEN** the title reads the two names joined by ` ⚭ ` and not by «и»

#### Scenario: One spouse
- **WHEN** a family names only one spouse
- **THEN** its title is that spouse's name, with no marriage sign
