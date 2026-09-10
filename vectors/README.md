# Shared test vectors

Known-answer tests for the DSTU primitives, kept apart from any one implementation because they belong
to all of them.

Every port — the JavaScript packages here, `barvinok-php`, anything that follows — must run these same
vectors. Ports that verify themselves against their own expectations drift, and drift in a signature
library is discovered by somebody whose document will not verify.

Nothing here yet: the vectors are extracted as each primitive is worked on.
