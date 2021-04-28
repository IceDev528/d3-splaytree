var svgTree
var g_Node
var g_tree = []
var g_selection = []
var g_index = 1;
var g_diameter = 20;
var g_xStep = 50
var g_yStep = 50
var g_startX = 0;
var g_startY = g_yStep;
var g_printY = 0;
var g_Stage = "compare";		//"compare", "move", "insert"
var g_splayStage = "mark_arrow";		//"mark_arrow", "move"
var g_highlight = 0;
var g_highlight_arrow = [0, 0];
var g_value = null;
var g_isPlaying = true;
var g_command = ""		//"insert", "delete", "find", "print"
var g_print_queue = [];
var g_delete_left = null;
var g_delete_right = null;

var g_Track = [];
var g_currentTrackIdx = 0;
var g_Step = [];
var g_currentStepIdx = 0;

const PRINT_POS_X  = 20;
const PRINT_VERTICAL_GAP  = 20;
const PRINT_HORIZONTAL_GAP = 40;

// parent id : 0  : root
//			  -1 : new node
function Node(id, val, x, y)
{
	this.id = id;
	this.value = val;
	this.x = x;
	this.y = y;
	this.leftWidth = 0;
	this.rightWidth = 0;
	this.print = false;
	this.left = 0;
	this.right = 0;
	this.parent = -1;	// undefined
}

Node.prototype.isLeftChild = function()		
{
	if (this.parent == 0)
	{
		return true;
	}
	return findNode(this.parent).left == this.id;	
}

Object.prototype.clone = function() {
	var newObj = (this instanceof Array) ? [] : {};
	for (i in this) {
	  if (i == 'clone') continue;
	  if (this[i] && typeof this[i] == "object") {
		newObj[i] = this[i].clone();
	  } else newObj[i] = this[i]
	} return newObj;
  };

window.onload = function() {

	svgTree = d3.select("#d3-splaytree")
	g_Node = svgTree.append("g")

	var w = document.getElementById("svg_width").value
	var h = document.getElementById("svg_height").value
	g_startX = w / 2;
	g_printY = h - PRINT_VERTICAL_GAP * 3

	document.getElementById("inNumber").oninput = function(e) {
		if( this.value.length > this.maxLength ) {
			this.value = this.value.slice(0, this.maxLength);			
		}
	}

	setPlayButtons()
	
	saveCurrentTrack()
}

function onChangeCanvasSize () {
	var w = document.getElementById("svg_width").value
	var h = document.getElementById("svg_height").value
	document.getElementById("d3-splaytree").setAttribute('width', w)
	document.getElementById("d3-splaytree").setAttribute('height', h)
	g_startX = w / 2;

	resizeTree();
	updateSvg();
}

function onMoveControl () {
	var current = document.getElementById("control").style.order;
	if( current == 0 ) {
		document.getElementById("control").style.order = 1;
	} else {
		document.getElementById("control").style.order = 0;
	}
}

function onChangeSpeed () {
	document.getElementById("animation_speed_val").innerHTML = document.getElementById("animation_speed").value;
}

function onInsert(){
	var val = document.getElementById("inNumber").value;
	if( val == '' )
		return;

	g_Step = []
	g_currentStepIdx = 0
	setFunctionButtons( true )	
	g_highlight = 0;
	g_command = "insert"
	g_Stage = "";	
	document.getElementById("control_stepforward").disabled = false
	
	saveCurrentStep()

	if( g_tree.length == 0 ) {
		g_value = new Node(g_index++, +val, g_startX, g_startY)
		g_value.parent = 0;
		g_tree.push(g_value)
	} else {
		g_value = new Node(g_index++, +val, g_diameter * 2, g_diameter * 2)
		g_tree.push(g_value)
	}


	updateSvg();

	if( g_isPlaying )
		play();
}


function onDelete(){

	g_highlight = 0;
	g_command = "delete"
	g_Stage = "";
	g_Step = []
	g_currentStepIdx = 0
	document.getElementById("control_stepforward").disabled = false
	setFunctionButtons( true )

	if( g_isPlaying )
		play();
}


function onFind(){

	g_highlight = 0;
	g_command = "find"
	g_Stage = "";	
	g_value = null
	g_Step = []
	g_currentStepIdx = 0
	document.getElementById("control_stepforward").disabled = false
	setFunctionButtons( true )
	
	if( g_isPlaying )
		play();
}


function onPrint(){

	g_highlight = 0;
	g_command = "print"
	g_Stage = "compare";
	g_print_queue = []
	g_Step = []
	g_currentStepIdx = 0
	document.getElementById("control_stepforward").disabled = false
	setFunctionButtons( true )

	g_tree.map((item) => {
		item.print = false
	})
	
	if( g_isPlaying )
		play();
}

function goInsertNextStep() {
	if( g_tree.length == 0 )
		return false;
	if( g_value == null || g_value.parent != -1)
		return false;

	var node
	if( g_Stage == "" || g_Stage == "compare" ) {
		if( g_highlight == 0 ) {
			node = findRootNode();
		} else {
			node = findNode(g_highlight);
		}
		g_highlight = node.id
		g_selection.push( node )
		g_Stage = "move"		
	} else if (g_Stage == "move" ){
		if( g_highlight == 0 ) {
			node = findRootNode()
		} else {
			node = findNode(g_highlight);
		}
		g_selection = [];
		if( node.value > g_value.value ) {
			if( node.left > 0 ) {
				g_selection.push( findNode(node.left) )
				g_highlight = node.left	
				g_Stage = "compare"
			} else {
				g_Stage = "insert"
			}
		} else {
			if( node.right > 0 ) {
				g_selection.push( findNode(node.right) )
				g_highlight = node.right
				g_Stage = "compare"
			} else {
				g_Stage = "insert"
			}
		}
	} else if (g_Stage == "insert") {
		g_Stage = ""
		g_selection = [];
		if( g_highlight == 0 ) {
			node = findRootNode()
		} else {
			node = findNode(g_highlight);
		}

		if( node.value > g_value.value ) {
			if( node.left == 0 ) {
				node.left = g_value.id
				g_value.parent = node.id
				g_value.x = node.x - g_xStep / 2;
				g_value.y = node.y + g_yStep;

				resizeTree()
			} else {
				g_highlight = node.left
			}
		} else {
			if( node.right == 0 ) {
				node.right = g_value.id
				g_value.parent = node.id				
				g_value.x = node.x + g_xStep / 2;
				g_value.y = node.y + g_yStep;

				resizeTree()
			} else {
				g_highlight = node.right
			}
		}
	}

	return true;
}

function goFindNextStep(value) {
	if( g_tree.length == 0 || g_value != null)
		return false;
	
	var node
	if( g_Stage == "" || g_Stage == "compare" ) {
		if( g_highlight == 0 ) {
			node = findRootNode();
		} else {
			node = findNode(g_highlight);
		}
		g_highlight = node.id
		g_selection.push( node )
		g_Stage = "move"		
	} else if (g_Stage == "move" ){
		if( g_highlight == 0 ) {
			node = findRootNode()
		} else {
			node = findNode(g_highlight);
		}
		g_selection = [];
		if( node.value == value ) {
			g_value = node
			g_Stage = ""
		}else if( node.value > value ) {
			if( node.left > 0 ) {
				g_selection.push( findNode(node.left) )
				g_highlight = node.left	
				g_Stage = "compare"
			} else {
				g_value = node
				g_Stage = ""
			}
		} else {
			if( node.right > 0 ) {
				g_selection.push( findNode(node.right) )
				g_highlight = node.right
				g_Stage = "compare"
			} else {
				g_value = node
				g_Stage = ""
			}
		}
	}

	return true;
}

function goPrintNextStep() {
	if( g_tree.length == 0 || g_Stage == "" )
		return false;
	
	var node
	if( g_Stage == "compare" ) {
		if( g_highlight == 0 ) {
			node = findRootNode();
		} else {
			node = findNode(g_highlight);
		}
		g_selection = []
		g_highlight = node.id
		var leftChild = findNode(node.left)
		var rightChild = findNode(node.right)
		g_selection.push( node )
		if( node.left != 0 && leftChild.print == false ) {
			g_Stage = "move"
		} else if( ( node.left == 0 || leftChild.print ) && node.print == false ) {
			g_Stage = "print"
		} else {
			g_Stage = "move"
		}
	} else if (g_Stage == "move" ){
		if( g_highlight == 0 ) {
			node = findRootNode()
		} else {
			node = findNode(g_highlight);
		}
		g_selection = [];
		
		var leftChild = findNode(node.left)
		var rightChild = findNode(node.right)
		if( node.left != 0 && leftChild.print == false ) {
			g_selection.push( leftChild )
			g_highlight = node.left					
		} else if( node.right == 0 || rightChild.print ) {			
			var parentNode = findNode(node.parent)
			if( node.parent > 0 ) {
				g_selection.push( parentNode )
				g_highlight = node.parent
				node.print = true

				if( !node.isLeftChild() ) {
					parentNode.print = true
				}
			} else {
				g_Stage = ""
				return false;
			}
		} else if( rightChild.print == false ) {
			g_selection.push( rightChild )
			g_highlight = node.right
		}
		
		g_Stage = "compare"
	} else if( g_Stage == "print" ) {
		node = findNode(g_highlight);
		g_print_queue.push( node )
		g_Stage = "move"	
	}

	return true;
}

function goDeleteNextStep(value) {
	if( g_tree.length == 0 || g_Stage == "end" )
		return false;
	
	var node
	if( g_Stage == "" ) {
		node = findRootNode();
		if( node.value == value ) {
			g_delete_left = findNode(node.left)
			g_delete_right = findNode(node.right)
			deleteRootNode()
			
			if( node.left == 0 && node.right == 0 )
				g_Stage = "end"
			else if( node.left != 0 && node.right != 0 ) {
				g_delete_left.parent = 0				
				g_value = findMax(g_delete_left)
				g_Stage = "merge"
			} else
				g_Stage = "merge"
		} else {
			g_Stage = "end"
		}
	} else if (g_Stage == "merge" ){
		if( g_delete_right == null )
		{
			g_delete_left.parent = 0
			g_Stage = "end"
			resizeTree()
		} else if( g_delete_left == null ) {
			g_delete_right.parent = 0
			g_Stage = "end"
			resizeTree()
		} else {			
			if( splayUp( g_value ) == false ) {
				g_value.parent = 0
				g_value.right = g_delete_right.id
				g_delete_right.parent = g_value.id
				g_Stage = "end"
				resizeTree()
			}
		}
	}

	return true;
}

function findRootNode() {
	var ret = null;
	g_tree.forEach( (node) => {
		if( node.parent == 0 )
			ret = node;
	})

	return ret;
}

function findNode(idx) {
	var ret = null;
	g_tree.forEach( (node) => {
		if( node.id == idx )
			ret = node;
	})

	return ret;
}

function deleteRootNode() {
	g_tree.forEach( (node, idx) => {
		if( node.parent == 0 )
			g_tree.splice(idx, 1)
	})
}

function findMax(tree) {
	var maxNode = tree
	while( maxNode.right != 0 ) {
		maxNode = findNode(maxNode.right)
	}

	return maxNode
}

function setNewPosition(tree, xPos, yPos, side) {
	if( tree == null )
		return;
	tree.y =  yPos;
	if( side == -1 )
		xPos -= tree.rightWidth;
	else if ( side == 1 )
		xPos += tree.leftWidth;

	tree.x = xPos;

	setNewPosition( findNode(tree.left), xPos, yPos + g_yStep, -1 )
	setNewPosition( findNode(tree.right), xPos, yPos + g_yStep, 1 )
}

function resizeTree() {
	var startPoint = g_startX;
	var rootNode = findRootNode();
	if( rootNode ) {
		resizeWidths(rootNode)

		if(rootNode.leftWidth > startPoint) {
			startPoint = rootNode.leftWidth
		} else if( rootNode.rightWidth > startPoint ) {
			startPoint = Math.max( rootNode.leftWidth, 2 * startPoint - rootNode.rightWidth )
		}

		setNewPosition(rootNode, startPoint, g_yStep, 0)
	}
}

function resizeWidths(tree) 
{
	if (tree == null)
	{
		return 0;
	}
	tree.leftWidth = Math.max(this.resizeWidths(findNode(tree.left)), g_xStep / 2);
	tree.rightWidth = Math.max(this.resizeWidths(findNode(tree.right)), g_xStep / 2);
	return tree.leftWidth + tree.rightWidth;
}

function play() {
	var aniSpeed = document.getElementById("animation_speed").value
	setTimeout(function() {
		var ret = onStepForward()
		if( g_isPlaying && ret ) {
			play()
		}

		if( !ret ) {
			g_value = null
		}

	}, aniSpeed);
}

function singleRotateRight(tree)
{
	console.log("singleRotateRight")
	var B = tree;
	var t3 = findNode(B.right);
	var A = findNode(tree.left);
	var t1 = findNode(A.left);
	var t2 = findNode(A.right);
	
	if (t2 != null)
	{
		t2.parent = B.id;
	}
	
	A.parent = B.parent;	
	if (B.parent != 0)
	{
		if (B.isLeftChild())
		{
			findNode(B.parent).left = A.id;
		}
		else
		{
			findNode(B.parent).right = A.id;
		}
	}
	A.right = B.id;
	B.parent = A.id;
	if( t2 == null)
		B.left = 0
	else
		B.left = t2.id;
	

	resizeTree();			
}

function singleRotateLeft(tree)
{
	console.log("singleRotateLeft")
	var A = tree;
	var B = findNode(tree.right);
	var t1 = findNode(A.left);
	var t2 = findNode(B.left);	
	var t3 = findNode(B.right);
		
	if (t2 != null)
	{
		t2.parent = A.id;
	}
	
	B.parent = A.parent;
	if (A.parent != 0)
	{
		if (A.isLeftChild())
		{
			findNode(A.parent).left = B.id;
		}
		else
		{
			findNode(A.parent).right = B.id;
		}
	}

	B.left = A.id;
	A.parent = B.id;
	if( t2 == null ) 
		A.right = 0;
	else
		A.right = t2.id;
	
	resizeTree();			
}

function zigZigRight(tree)
{
	console.log("zigZigRight")
	var C = tree;
	var B = findNode(tree.left);
	var A = findNode(B.left);
	var t2 = findNode(A.right);
	var t3 = findNode(B.right);
	
	if (C.parent != 0)
	{
		var CParent = findNode(C.parent)
		if (C.isLeftChild())
		{
			CParent.left = A.id;
		}
		else
		{
			CParent.right = A.id;
		}
	}
		
	if (t2 != null)
	{
		t2.parent = B.id
	}
	if (t3 != null)
	{
		t3.parent = C.id
	}
	
	A.right = B.id
	A.parent = C.parent
	B.parent = A.id
	if( t2 == null)
		B.left = 0
	else
		B.left = t2.id
	B.right = C.id;
	C.parent = B.id;
	if ( t3 == null )
		C.left = 0
	else
		C.left = t3.id;
	resizeTree();			
}


function zigZigLeft(tree)
{
	console.log("zigZigLeft")
	var A = tree;
	var B = findNode(tree.right);
	var C = findNode(B.right);
	var t2 = findNode(B.left);
	var t3 = findNode(C.left);
		
	if (A.parent != 0)
	{
		var AParent = findNode(A.parent)
		if (A.isLeftChild())
		{
			AParent.left = C.id;
		}
		else
		{
			AParent.right = C.id;
		}
	}
	
	if (t2 != null)
	{
		t2.parent = A.id;
	}
	if (t3 != null)
	{
		t3.parent = B.id;
	}
	
	C.parent = A.parent;
	if( t2 == null )
		A.right = 0
	else
		A.right = t2.id;
	B.left = A.id;
	A.parent = B.id;
	if( t3 == null )
		B.right = 0
	else
		B.right = t3.id;
	C.left = B.id;
	B.parent = C.id;
	
	resizeTree();
}

function doubleRotateRight(tree)
{
	console.log("doubleRotateRight")
	var A = findNode(tree.left);
	var B = findNode(A.right);
	var C = tree;
	var t2 = findNode(B.left);
	var t3 = findNode(B.right);
	
	if (t2 != null)
	{
		t2.parent = A.id;
		A.right = t2.id;
	}
	if (t3 != null)
	{
		t3.parent = C.id;
		C.left = t3.id;
	}
	if (C.parent == 0)
	{
		B.parent = 0;
	}
	else
	{
		var CParent = findNode(C.parent)
		if (C.isLeftChild())
		{
			CParent.left = B.id
		}
		else
		{
			CParent.right = B.id
		}
		B.parent = C.parent;
		C.parent = B.id;
	}
	
	B.left = A.id;
	A.parent = B.id;
	B.right=C.id;
	C.parent=B.id;
	if( t2 == null )
		A.right = 0
	else
		A.right=t2.id;
	if( t3 == null )
		C.left = 0
	else
		C.left = t3.id;
	
	resizeTree();
}

function doubleRotateLeft(tree)
{
	console.log("doubleRotateLeft")
	var A = tree
	var C = findNode(tree.right)
	var B = findNode(C.left)
	var t2 = findNode(B.left)
	var t3 = findNode(B.right)
		
	if (t2 != null)
	{
		t2.parent = A.id
		A.right = t2.id
	}
	if (t3 != null)
	{
		t3.parent = C.id;
		C.left = t3.id;
	}
		
	if (A.parent == 0)
	{
		B.parent = 0
	}
	else
	{
		var AParent = findNode(A.parent)
		if (A.isLeftChild())
		{
			AParent.left = B.id
		}
		else
		{
			AParent.right = B.id;
		}
		B.parent = A.parent;
		A.parent = B.id;		
	}
	
	B.left = A.id;
	A.parent = B.id;
	B.right=C.id;
	C.parent=B.id;
	if( t2 == null )
		A.right = 0
	else
		A.right=t2.id
	if( t3 == null )
		C.left = 0
	else
		C.left = t3.id
	
	resizeTree();	
}

function splayUp(tree) {
	var ret = true
	if (tree == null || tree.parent == 0)
	{
		return false;
	}
	else {
		var parentNode = findNode(tree.parent)

		if (parentNode.parent == 0)
		{
			if (tree.isLeftChild())
			{			
				if( g_splayStage == "mark_arrow" ) {
					g_highlight_arrow[0] = tree.id
				} else {
					singleRotateRight(parentNode);
				}
			}
			else
			{
				if( g_splayStage == "mark_arrow" ) {
					g_highlight_arrow[0] = tree.id
				} else {
					singleRotateLeft(parentNode);
				}
			}
		}
		else if (tree.isLeftChild() && !parentNode.isLeftChild())
		{
			if( g_splayStage == "mark_arrow" ) {
				g_highlight_arrow[0] = tree.id
				g_highlight_arrow[1] = parentNode.id
			} else
				doubleRotateLeft(findNode(parentNode.parent));
		}
		else if (!tree.isLeftChild() && parentNode.isLeftChild())
		{
			if( g_splayStage == "mark_arrow" ) {
				g_highlight_arrow[0] = tree.id
				g_highlight_arrow[1] = parentNode.id
			} else
				doubleRotateRight(findNode(parentNode.parent));
		}
		else if (tree.isLeftChild())
		{		
			if( g_splayStage == "mark_arrow" ) {
				g_highlight_arrow[0] = tree.id
				g_highlight_arrow[1] = parentNode.id
			} else
				zigZigRight(findNode(parentNode.parent));
		}
		else
		{
			if( g_splayStage == "mark_arrow" ) {
				g_highlight_arrow[0] = tree.id
				g_highlight_arrow[1] = parentNode.id
			} else
				zigZigLeft(findNode(parentNode.parent));
		}
	}
	if( g_splayStage == "mark_arrow" ) {
		g_splayStage = "move"
	}else if( g_splayStage == "move" ) {
		g_splayStage = "mark_arrow"
		g_highlight_arrow[0] = 0
		g_highlight_arrow[1] = 0
	}
	return ret;
}


function setFunctionButtons( disabled ) {	
	document.getElementById("toolbar_insert").disabled = disabled
	document.getElementById("toolbar_delete").disabled = disabled
	document.getElementById("toolbar_find").disabled = disabled
	document.getElementById("toolbar_print").disabled = disabled
}

function setPlayButtons() {
	if( g_isPlaying ) {
		document.getElementById("control_stepback").disabled = true;		
		document.getElementById("control_stepforward").disabled = true;

		document.getElementById("control_skipforward").disabled = true;

		document.getElementById("control_play").value = "Pause";		
	} else {
		if( g_currentStepIdx > 0 )
			document.getElementById("control_stepback").disabled = false;
		
		document.getElementById("control_stepforward").disabled = false;

		if( g_currentTrackIdx > 0 )
			document.getElementById("control_skipforward").disabled = false;		

		document.getElementById("control_play").value = "Play";		
	}
}

function onPlay() {
	g_isPlaying = !g_isPlaying

	setPlayButtons()
	play();
}

function saveCurrentStep() {
	g_Step.push({
		tree: g_tree.clone(),
		selection: g_selection.clone(),
		stage: g_Stage,
		splayStage: g_splayStage,
		highlight: g_highlight,
		highlight_arrow: [...g_highlight_arrow],
		value: g_value ? g_value.id : 0,
		print_queue: g_print_queue.clone()
	})

	g_currentStepIdx++
}

function loadPrevStep() {
	if( g_currentStepIdx == 0)
		return
		
	var current = g_Step.pop()
	
	g_tree = current.tree
	g_selection = current.selection
	g_Stage = current.stage
	g_splayStage = current.splayStage
	g_highlight = current.highlight
	g_highlight_arrow = current.highlight_arrow
	g_value = current.value == 0 ? null : findNode(current.value)
	g_print_queue = current.print_queue

	g_currentStepIdx--
}

function saveCurrentTrack() {
	g_Track = g_Track.slice(0, g_currentTrackIdx + 1)

	g_Track.push({
		tree: g_tree.clone(),
		selection: g_selection.clone(),
		stage: g_Stage,
		splayStage: g_splayStage,
		highlight: g_highlight,
		highlight_arrow: [...g_highlight_arrow],
		value: g_value ? g_value.id : 0,
		print_queue: g_print_queue.clone()
	})

	g_currentTrackIdx++
}

function loadPrevTrack() {
	if( g_currentTrackIdx == 0)
		return
		
	g_currentTrackIdx--

	var current = g_Track[g_currentTrackIdx]
	g_tree = current.tree.clone()
	g_selection = current.selection.clone()
	g_Stage = current.stage
	g_splayStage = current.splayStage
	g_highlight =  current.highlight
	g_highlight_arrow = [...current.highlight_arrow]
	g_value = current.value == 0 ? null : findNode(current.value)
	g_print_queue = current.print_queue.clone()
}

function goNextTrack() {
	if( g_currentTrackIdx < g_Track.length - 1 ) {
		g_currentTrackIdx++

		var current = g_Track[g_currentTrackIdx]
		g_tree = current.tree.clone()
		g_selection = current.selection.clone()
		g_Stage = current.stage
		g_splayStage = current.splayStage
		g_highlight =  current.highlight
		g_highlight_arrow = [...current.highlight_arrow]
		g_value = current.value == 0 ? null : findNode(current.value)
		g_print_queue = current.print_queue.clone()
	}
}

function onSkipBack() {
	if( g_currentTrackIdx > 0 ) {
		loadPrevTrack()
		updateSvg()		
		document.getElementById("control_skipforward").disabled = false	
	}

	setFunctionButtons( false )
	if( g_currentTrackIdx == 0 )
		document.getElementById("control_skipback").disabled = true
	else
		document.getElementById("control_skipback").disabled = false

}

function onSkipForward() {
	if( g_currentTrackIdx < g_Track.length - 1 ) {
		goNextTrack()
		updateSvg()	
	}

	setFunctionButtons( false )
	if( g_currentTrackIdx == g_Track.length - 1 )
		document.getElementById("control_skipforward").disabled = true
	
	document.getElementById("control_skipback").disabled = false
}

function onStepForward () {
	var ret = false
	var val = document.getElementById("inNumber").value;
	
	saveCurrentStep()
	if( !g_isPlaying )
		document.getElementById("control_stepback").disabled = false

	if( g_command == "insert" ) {
		ret = goInsertNextStep()
	} else if( g_command == "delete" ) {
		if( val != '' )
			ret = goFindNextStep(val)
	} else if( g_command == "find" ) {
		if( val != '' )
			ret = goFindNextStep(val)
	} else if( g_command == "print" ) {
		ret = goPrintNextStep()
	}

	if( ret == false ) {
		//goNext
		ret = splayUp(g_value)
	}

	if( g_command == "delete" && ret == false ) {
		if( val != '' )
			ret = goDeleteNextStep(val)
	}

	updateSvg()

	if( !ret ) {		
		
		document.getElementById("control_stepback").disabled = false
		document.getElementById("control_stepforward").disabled = true
		document.getElementById("control_skipback").disabled = false

		saveCurrentTrack()
		setFunctionButtons( false )
	}

	return ret;
}

function onStepBack() {
	if( g_currentStepIdx > 0 ) {
		loadPrevStep()
		updateSvg()	
	}

	setFunctionButtons( true )
	document.getElementById("control_stepforward").disabled = false
	if( !g_isPlaying && g_currentStepIdx == 0 ) {
		document.getElementById("control_stepback").disabled = true
		document.getElementById("control_stepforward").disabled = true
		setFunctionButtons( false )
	}
}

function calcLineXY(x1, y1, x2, y2, r) {
	var ret = [0, 0]
    var angle = Math.atan2( y1 - y2, x1 - x2 ); 

	ret[0] = x1 - r * Math.cos(angle)
	ret[1] = y1 - r * Math.sin(angle)

	return ret;
}

function updateSvg() {
    //rejoin data
    var nodes = g_Node.selectAll(".node").data(g_tree);
    
    nodes.exit().remove();//remove unneeded circles
    var node = nodes.enter()
    				.append("g")
    				.attr('class', 'node')

    var links = node.append("line")
    	/*.attr("class", "unlink")	
        .attr("x1",function(d)  { return d.x })
        .attr("y1",function(d) { return d.y })
        .attr("x2",function(d) { return d.x })
        .attr("y2",function(d) { return d.y })*/
    	.attr("class", function(d) {
    		if( d.parent == 0 || d.parent == -1 ) 
        		return "unlink"
			if( findNode(d.parent) == null ) {
				return "unlink"
			}
        	return "link"
    	})    	
        .attr("x1",function(d)  {
        	if( d.parent == 0 )
        		return d.x

        	var parent = d.parent;
        	if( d.parent == -1 ) {
        		if( g_highlight == 0 )
	        		return d.x

	        	parent = g_highlight
        	}
			
			var parentNode = findNode(parent);
			if( parentNode == null )
				return d.x
			var dot = calcLineXY(parentNode.x, parentNode.y, d.x, d.y, g_diameter)
        	return dot[0]
        })
        .attr("y1",function(d) {
        	if( d.parent == 0 )
        		return d.y

        	var parent = d.parent;
        	if( d.parent == -1 ) {
        		if( g_highlight == 0 )
	        		return d.y

	        	parent = g_highlight
        	}
        	var parentNode = findNode(parent);
			if( parentNode == null )
				return d.x
		
        	var dot = calcLineXY(parentNode.x, parentNode.y, d.x, d.y, g_diameter)
        	return dot[1]
        })
        .attr("x2",function(d) {
        	if( d.parent == 0 )
        		return d.x

        	var parent = d.parent;
        	if( d.parent == -1 ) {
        		if( g_highlight == 0 )
	        		return d.x

	        	parent = g_highlight
        	}
        	var parentNode = findNode(parent);
			if( parentNode == null )
				return d.x
		
        	var dot = calcLineXY(d.x, d.y, parentNode.x, parentNode.y, g_diameter + 3)
        	return dot[0]
        })
        .attr("y2",function(d) {        	
        	if( d.parent == 0 )
        		return d.y

        	var parent = d.parent;
        	if( d.parent == -1 ) {
        		if( g_highlight == 0 )
	        		return d.y

	        	parent = g_highlight
        	}
        	var parentNode = findNode(parent);
			if( parentNode == null )
				return d.x
		
        	var dot = calcLineXY(d.x, d.y, parentNode.x, parentNode.y, g_diameter + 3)
        	return dot[1]
        })
    	.attr("marker-end", "url(#arrow)")    
         .attr("stroke","#383070")  
         .attr("stroke-width",2)  
    

    var nodeDot = node.append("g")
    	.attr('class', 'point')
    	.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")" })

    nodeDot.append("circle")
    	.attr("class", "circle")
        .attr("r",g_diameter)
        .attr("cx", 0)
        .attr("cy", 0)

    nodeDot.append("text")
    	.attr("class", "textcircle")
        .attr("x", 0)
        .attr("y", 5)
        .text(function(d) { return d.value })

	var aniSpeed = document.getElementById("animation_speed").value
    //update all circles to new positions
    var updateNode = nodes.transition()
        .duration(aniSpeed / 2)

    updateNode.select('.point')
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")" })

    updateNode.select("circle")
        .attr("stroke", function(d) { 
        	if (g_Stage == "move") {
        		if( d.id == g_highlight || d.parent == -1 ) {
        			return "red"
        		}
        	}

        	return "white"
        });

	updateNode.select(".textcircle")
		.text(function(d) { return d.value })

    updateNode.select(".unlink, .link")
    	.attr("class", function(d) {
    		if( d.parent == 0 || d.parent == -1 ) 
        		return "unlink"
			if( findNode(d.parent) == null ) {
				return "unlink"
			}
        	return "link"
    	})    	
        .attr("x1",function(d)  {
        	if( d.parent == 0 )
        		return d.x

        	var parent = d.parent;
        	if( d.parent == -1 ) {
        		if( g_highlight == 0 )
	        		return d.x

	        	parent = g_highlight
        	}
			
			var parentNode = findNode(parent);
			if( parentNode == null )
				return d.x
			var dot = calcLineXY(parentNode.x, parentNode.y, d.x, d.y, g_diameter)
        	return dot[0]
        })
        .attr("y1",function(d) {
        	if( d.parent == 0 )
        		return d.y

        	var parent = d.parent;
        	if( d.parent == -1 ) {
        		if( g_highlight == 0 )
	        		return d.y

	        	parent = g_highlight
        	}
        	var parentNode = findNode(parent);
			if( parentNode == null )
				return d.x
		
        	var dot = calcLineXY(parentNode.x, parentNode.y, d.x, d.y, g_diameter)
        	return dot[1]
        })
        .attr("x2",function(d) {
        	if( d.parent == 0 )
        		return d.x

        	var parent = d.parent;
        	if( d.parent == -1 ) {
        		if( g_highlight == 0 )
	        		return d.x

	        	parent = g_highlight
        	}
        	var parentNode = findNode(parent);
			if( parentNode == null )
				return d.x
		
        	var dot = calcLineXY(d.x, d.y, parentNode.x, parentNode.y, g_diameter + 3)
        	return dot[0]
        })
        .attr("y2",function(d) {        	
        	if( d.parent == 0 )
        		return d.y

        	var parent = d.parent;
        	if( d.parent == -1 ) {
        		if( g_highlight == 0 )
	        		return d.y

	        	parent = g_highlight
        	}
        	var parentNode = findNode(parent);
			if( parentNode == null )
				return d.x
		
        	var dot = calcLineXY(d.x, d.y, parentNode.x, parentNode.y, g_diameter + 3)
        	return dot[1]
        })
    	.attr("marker-end", function(d) { 
			if( d.id == g_highlight_arrow[0] || d.id == g_highlight_arrow[1] ) {
				return "url(#arrow_red)"
			}
			return "url(#arrow)"
		})    
		.attr("stroke", function(d) { 
			if( d.id == g_highlight_arrow[0] || d.id == g_highlight_arrow[1] ) {
				return "red"
			}
			return "#383070"
        });

    //////////////////////////////////////////
    var selection = g_Node.selectAll(".selection").data(g_selection);
	
    selection.exit().remove();//remove unneeded circles
    var node = selection.enter()
    				.append("circle")
    				.attr('class', 'selection')
			        .attr("r",g_diameter)
			        .attr("cx", function(d) { return d.x})
			        .attr("cy", function(d) { return d.y})
			        .attr("visibility", "hidden")

    //update all circles to new positions
    selection.transition()
        .duration(aniSpeed / 2)
        .attr("visibility", "visible")
        .attr("cx", function(d) { return d.x})
        .attr("cy", function(d) { return d.y})
        .attr("stroke", function(d) {
        	if (g_Stage == "move") {
        		return "red"
        	} else {
        		return "red"
        	}
        })

	updatePrint()
}

function updatePrint() {
	//rejoin data
    var nodes = g_Node.selectAll(".print").data(g_print_queue);
    
	nodes.exit().remove();//remove unneeded circles
    var node = nodes.enter()
			.append("text")
			.attr('class', 'print')
			.attr('text-anchor', 'middle')
			.attr("x", function(d) { return d.x })
			.attr("y", function(d) { return d.y + 5 })
			.text(function(d) { return d.value })

	var aniSpeed = document.getElementById("animation_speed").value
    //update all circles to new positions
    nodes.transition()
        .duration(aniSpeed / 2)
        .attr("x", function(d, i) { 
        	return PRINT_POS_X + PRINT_HORIZONTAL_GAP * (i % 10)
        })
		.attr("y", function(d, i) { 
        	return g_printY + PRINT_VERTICAL_GAP * parseInt(i / 10)
        });
}
