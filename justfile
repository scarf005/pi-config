# scan every commit and the tracked files for secrets
audit:
    go run github.com/zricethezav/gitleaks/v8@v8.30.0 git --redact --no-banner .

# run gitleaks on every commit
install-hooks:
    prek install
