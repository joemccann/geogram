



function go(d){
	var ul = "<ul>"

	d.data.forEach(function(el){ul += "<li><img src='"+el.images.standard_resolution.url+"'></li>"})

	ul += "</ul>"

	$('body > *').remove()

	$('body').append(ul)	
}

