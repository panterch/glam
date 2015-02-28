# The Endless Story

This project is being developed as part of the [#GLAMhack](https://twitter.com/search?q=%23glamhack&src=typd) event at the National Library in Switzerland.

* [Wiki Entry](make.opendata.ch/wiki/project:the-endless-story)

## Team
* [@beatseeliger](https://twitter.com/beatseeliger)
* [@bennyschudel](https://twitter.com/bennyschudel)
* [@patbaumgartner](https://twitter.com/patbaumgartner)
* [@philippkueng](https://twitter.com/philippkueng)

## Uses

* https://www.wikidata.org
* https://jsonp.nodejitsu.com

## Deployment

Compile the javascript and bundle it for the browser to serve
```bash
browserify demos/searcher.js -r wikidata-sdk:request:bluereq:underscore -o bundle.js --debug
```
