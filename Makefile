all: v0.8 v0.10 v0.11 v0.12 v4.2 v5.2

doc:
	@npm run doc

readme:
	@markedpp README.md > tmp.md; \
	mv tmp.md README.md;

clean:
	@rm -rf doc coverage

v%:
	n $@
	npm test

.PHONY: all doc clean