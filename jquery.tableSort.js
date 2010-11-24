/* ===============================
| TABLESORT.JS
| Copyright, Andy Croxall (mitya@mitya.co.uk)
| For documentation and demo see http://mitya.co.uk/scripts/Animated-table-sort-REGEXP-friendly-111
|
| USAGE
| This script may be used, distributed and modified freely but this header must remain in tact.
| For usage info and demo, including info on args and params, see www.mitya.co.uk/scripts
=============================== */


jQuery.fn.sortTable = function(params) {


	/*-----------
	| STOP right now if anim already in progress
	-----------*/

	if (jQuery(this).find(':animated').length > 0) return;
	
	/*-----------
	| VALIDATE TABLE & PARAMS
	|	- if no col to sort on passed, complain and return
	|	- if table doesn't contain requested col, complain and return
	| If !sortType or invalid sortType, assume ascii sort
	-----------*/
	
	var error = null;
	var complain = null;
	if (!params.onCol) { error = "No column specified to search on"; complain = true; }
	else if (jQuery(this).find('td:nth-child('+params.onCol+')').length == 0) { error = "The requested column wasn't found in the table"; complain = true; }
	if (error) { if (complain) alert(error); return; }
	if (!params.sortType || params.sortType != 'numeric') params.sortType = 'ascii';


	/*-----------
	| PREP
	| 	- declare array to store the contents of each <td>, or, if sorting on regexp, the pattern match of the regexp in each <td>
	| 	- Give the <table> position: relative to aid animation
	| 	- Mark the col we're sorting on with an identifier class
	-----------*/
	
	var valuesToSort = [];
	jQuery(this).css('position', 'relative');
	var doneAnimating = 0;
	var tdSelectorText = 'td'+(!params.onCol ? '' : ':nth-child('+params.onCol+')');
	jQuery(this).find('td:nth-child('+params.onCol+')').addClass('sortOnThisCol');
	var thiss = this;


	/*-----------
	| Iterate over table and. For each:
	| 	- append its content / regexp match (see above) to valuesToSort[]
	| 	- create a new <div>, give it position: absolute and copy over the <td>'s content into it
	| 	- fix the <td>'s width/height to its offset width/height so that, when we remove its html, it won't change shape
	|	- clear the <td>'s content
	| 	- clear the <td>'s content
	| There is no visual effect in this. But it means each <td>'s content is now 'animatable', since it's position: absolute.
	-----------*/	
	
	var counter = 0;
	jQuery(this).find('td').each(function() {
		if (jQuery(this).is('.sortOnThisCol') || (!params.onCol && !params.keepRelationships)) {
			var valForSort = !params.child ? jQuery(this).text() : (params.child != 'input' ? jQuery(this).find(params.child).text() : jQuery(this).find(params.child).val());
			if (params.regexp) {
				valForSort = valForSort.match(new RegExp(params.regexp))[!params.regexpIndex ? 0 : params.regexpIndex];
			}
			valuesToSort.push(valForSort);
		}
		var thisTDHTMLHolder = document.createElement('div');
		with(jQuery(thisTDHTMLHolder)) {
			html(jQuery(this).html());
			if (params.child && params.child == 'input') html(html().replace(/<input /, "<input value='"+jQuery(this).find(params.child).val()+"'", html()));
			css({position: 'relative', left: 0, top: 0});
		}
		jQuery(this).html('');
		jQuery(this).append(thisTDHTMLHolder);
		counter++;
	});
	
	
	/*-----------
	| Sort values array.
	|	- Sort (either simply, on ascii, or numeric if sortNumeric == true)
	|	- If descending == true, reverse after sort
	-----------*/

	params.sortType == 'numeric' ? valuesToSort.sort(function(a, b) { return (a.replace(/[^\d\.]/g, '', a)-b.replace(/[^\d\.]/g, '', b)); }) : valuesToSort.sort();
	if (params.sortDesc) {
		valuesToSort_tempCopy = [];
		for(var u=valuesToSort.length; u--; u>=0) valuesToSort_tempCopy.push(valuesToSort[u]);
		valuesToSort = valuesToSort_tempCopy;
		delete(valuesToSort_tempCopy)
	}
	

	
	/*-----------
	| Now, for each:
	-----------*/
	
	for(var k in valuesToSort) {
		
		//establish current <td> relating to this value of the array
		var currTD = jQuery(jQuery(this).find(tdSelectorText).filter(function() {
			return (
				(
					!params.regexp
					&&
					(
						(
							params.child
							&&
							(
								(
									params.child != 'input'
									&&
									valuesToSort[k] == jQuery(this).find(params.child).text()
								)
								||
								params.child == 'input'
								&&
								valuesToSort[k] == jQuery(this).find(params.child).val()
							)
						)
						||
						(
							!params.child
							&&
							valuesToSort[k] == jQuery(this).children('div').html()
						)
					)
				)
				||
				(
					params.regexp
					&&
					jQuery(this).children('div').html().match(new RegExp(params.regexp))[!params.regexpIndex ? 0 : params.regexpIndex] == valuesToSort[k]
				)
			)
			&&
			!jQuery(this).hasClass('tableSort_TDRepopulated');
		}).get(0));
		
		//give current <td> a class to mark it as having been used, so we don't get confused with duplicate values
		currTD.addClass('tableSort_TDRepopulated');
		
		//establish target <td> for this value and store as a node reference on this <td>
		var targetTD = jQuery(jQuery(this).find(tdSelectorText).get(k));
		currTD.get(0).toTD = targetTD;
		
		//if we're sorting on a particular column and maintaining relationships, also give the other <td>s in rows a node reference
		//denoting ITS target, so they move with their lead siibling
		if (params.keepRelationships) {
			var counter = 0;
			jQuery(currTD).parent().children('td').each(function() {
				jQuery(this).get(0).toTD = jQuery(targetTD.parent().children().get(counter));
				counter++;
			});
		}
		
		//establish current relative positions for the current and target <td>s and use this to calculate how far each <div> needs to move
		var currPos = currTD.position();
		var targetPos = targetTD.position();
		var moveBy_top = targetPos.top - currPos.top;
		
		//invert values if going backwards/upwards
		if (targetPos.top > currPos.top) moveBy_top = Math.abs(moveBy_top);
		
		/*-----------
		| ANIMATE
		| 	- work out what to animate on.
		| 		- if !keepRelationships, animate only <td>s in the col we're sorting on (identified by .sortOnThisCol)
		| 		- if keepRelationships, animate all cols but <td>s that aren't .sortOnThisCol follow lead sibiling with .sortOnThisCol
		| 	- run animation. On callback, update each <td> with content of <div> that just moved into it and remove <div>s
		|	- If noAnim, we'll still run aniamte() but give it a low duration so it appears instant
		-----------*/		
		
		var animateOn = params.keepRelationships ? currTD.add(currTD.siblings()) : currTD;
		var done = 0;
		animateOn.children('div').animate({top: moveBy_top}, !params.noAnim ? 500 : 0, null, function() {
			if (jQuery(this).parent().is('.sortOnThisCol') || !params.keepRelationships) {
				done++;
				if (done == valuesToSort.length-1) thiss.tableSort_cleanUp();
			}
		});
		
	}
		
};


jQuery.fn.tableSort_cleanUp = function() {

	/*-----------
	| AFTER ANIM
	| 	- assign each <td> its new content as property of it (DON'T populate it yet - this <td> may still need to be read by
	|	  other <td>s' toTD node references
	|	- once new contents for each <td> gathered, populate
	|	- remove some identifier classes and properties
	-----------*/
	jQuery(this).find('td').each(function() {
		if(jQuery(this).get(0).toTD) jQuery(jQuery(this).get(0).toTD).get(0).newHTML = jQuery(this).children('div').html();
	});
	jQuery(this).find('td').each(function() { jQuery(this).html(jQuery(this).get(0).newHTML); });
	jQuery('td.tableSort_TDRepopulated').removeClass('tableSort_TDRepopulated');
	jQuery(this).find('.sortOnThisCol').removeClass('sortOnThisCol');
	jQuery(this).find('td[newHTML]').attr('newHTML', '');
	jQuery(this).find('td[toTD]').attr('toTD', '');
	
};
