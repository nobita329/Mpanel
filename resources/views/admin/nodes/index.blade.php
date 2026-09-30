@extends('layouts.admin')

@section('title')
    List Nodes
@endsection

@section('scripts')
    @parent
    {!! Theme::css('vendor/fontawesome/animation.min.css') !!}
@endsection

@section('content-header')
    <h1>Nodes<small>All nodes available on the system.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Nodes</li>
    </ol>
@endsection

@section('content')
<div class="row" id="wings-update-section" style="display:none;">
    <div class="col-xs-12">
        <div class="box box-warning">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-refresh fa-fw"></i> Wings Agent Updates</h3>
                <div class="box-tools pull-right">
                    <button id="wings-update-all-btn" class="btn btn-sm btn-warning" style="display:none;">
                        <i class="fa fa-upload"></i> Update All
                    </button>
                </div>
            </div>
            <div class="box-body" id="wings-update-body">
                <i class="fa fa-spinner fa-spin"></i> Checking&hellip;
            </div>
        </div>
    </div>
</div>
<div class="row" id="wings-daemon-update-section" style="display:none;">
    <div class="col-xs-12">
        <div class="box box-danger">
            <div class="box-header with-border">
                <h3 class="box-title"><i class="fa fa-cloud-download fa-fw"></i> Pterodactyl Wings Updates</h3>
                <div class="box-tools pull-right">
                    <button id="wings-daemon-update-all-btn" class="btn btn-sm btn-danger" style="display:none;">
                        <i class="fa fa-upload"></i> Update All
                    </button>
                </div>
            </div>
            <div class="box-body" id="wings-daemon-update-body">
                <i class="fa fa-spinner fa-spin"></i> Checking&hellip;
            </div>
        </div>
    </div>
</div>
{{-- ═══════════════ Mass Actions Section ═══════════════ --}}
@if(Auth::user()->root_admin)
<div class="row" id="mass-actions-section">
    <div class="col-xs-12">
        <div class="box box-solid" style="border-color:#3c8dbc;">
            <div class="box-header with-border" style="background:#3c8dbc; color:#fff;">
                <h3 class="box-title" style="color:#fff;"><i class="fa fa-th-list"></i> Mass Actions</h3>
                <div class="box-tools pull-right">
                    <span id="ma-selected-count" style="font-size:12px; background:rgba(255,255,255,0.2); padding:3px 10px; border-radius:3px; color:#fff;">0 nodes selected</span>
                </div>
            </div>
            <div class="box-body">
                <div class="row">
                    {{-- App Name --}}
                    <div class="col-sm-5">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-tag"></i> Set App Name</h4>
                        <p style="font-size:12px; color:#aaa; margin-bottom:8px;">Applies to selected nodes' Wings configuration.</p>
                        <div class="input-group">
                            <input type="text" id="ma-app-name" class="form-control" placeholder="e.g. My Game Panel" maxlength="191" />
                            <span class="input-group-btn">
                                <button id="ma-appname-btn" class="btn btn-primary" onclick="massApplyAppName()" disabled>
                                    <i class="fa fa-save"></i> Apply to Selected
                                </button>
                            </span>
                        </div>
                        <div id="ma-appname-result" style="margin-top:8px; font-size:12px;"></div>
                    </div>

                    {{-- Wings Service Controls --}}
                    <div class="col-sm-4">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-cogs"></i> Wings Service</h4>
                        <p style="font-size:12px; color:#aaa; margin-bottom:8px;">Control Wings on selected nodes via the Wings Agent.</p>
                        <div class="btn-group">
                            <button id="ma-btn-start" class="btn btn-success" onclick="massWingsAction('start')" disabled>
                                <i class="fa fa-play"></i> Start
                            </button>
                            <button id="ma-btn-restart" class="btn btn-warning" onclick="massWingsAction('restart')" disabled>
                                <i class="fa fa-refresh"></i> Restart
                            </button>
                            <button id="ma-btn-stop" class="btn btn-danger" onclick="massWingsAction('stop')" disabled>
                                <i class="fa fa-stop"></i> Stop
                            </button>
                        </div>
                        <div id="ma-wings-result" style="margin-top:8px; font-size:12px;"></div>
                    </div>

                    {{-- Select helpers --}}
                    <div class="col-sm-3">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-check-square-o"></i> Selection</h4>
                        <p style="font-size:12px; color:#aaa; margin-bottom:8px;">Use checkboxes in the table below.</p>
                        <button class="btn btn-default btn-sm" onclick="massSelectAll()"><i class="fa fa-check-square-o"></i> Select All</button>
                        <button class="btn btn-default btn-sm" onclick="massDeselectAll()"><i class="fa fa-square-o"></i> Deselect All</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endif

<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Node List</h3>
                <div class="box-tools">
                    <form action="{{ route('admin.nodes') }}" method="GET" style="display: inline-block;">
                        <div class="input-group input-group-sm search01" style="width: 250px;">
                            <input type="text" name="filter[name]" class="form-control pull-right" value="{{ request()->input('filter.name') }}" placeholder="Search Nodes">
                            <div class="input-group-btn">
                                <button type="submit" class="btn btn-default"><i class="fa fa-search"></i></button>
                            </div>
                        </div>
                    </form>
                    @if(Auth::user()->root_admin || Auth::user()->hasAdminPermission('admin.nodes.create'))
                        <a href="{{ route('admin.nodes.new') }}"><button type="button" class="btn btn-sm btn-primary">Create New</button></a>
                    @endif
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th style="width:40px;"></th>
                            @if(Auth::user()->root_admin)
                            <th style="width:36px;"><input type="checkbox" id="ma-check-all" title="Select all" onclick="massToggleAll(this.checked)"></th>
                            @endif
                            <th></th>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Memory</th>
                            <th>Disk</th>
                            <th class="text-center">Servers</th>
                            <th class="text-center">Limit</th>
                            <th class="text-center">SSL</th>
                            <th class="text-center">Public</th>
                        </tr>
                        @foreach ($nodes as $node)
                            <tr class="sortable-row" draggable="true" data-node-id="{{ $node->id }}">
                                <td class="text-center text-muted drag-handle"><i class="fa fa-fw fa-bars"></i></td>
                                @if(Auth::user()->root_admin)
                                <td class="text-center" style="vertical-align:middle;">
                                    <input type="checkbox" class="ma-node-check" data-node-id="{{ $node->id }}" data-node-name="{{ $node->name }}">
                                </td>
                                @endif
                                <td class="text-center text-muted left-icon" data-action="ping" data-secret="{{ $node->getDecryptedKey() }}" data-location="{{ $node->scheme }}://{{ $node->fqdn }}:{{ $node->daemonListen }}/api/system"><i class="fa fa-fw fa-refresh fa-spin"></i></td>
                                <td>{!! $node->maintenance_mode ? '<span class="label label-warning"><i class="fa fa-wrench"></i></span> ' : '' !!}<a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></td>
                                <td>{{ $node->location->short }}</td>
                                <td>{{ $node->memory }} MiB</td>
                                <td>{{ $node->disk }} MiB</td>
                                <td class="text-center">
                                    @if(is_null($node->server_limit))
                                        {{ $node->servers_count }}
                                    @else
                                        {{ $node->servers_count }}/{{ $node->server_limit }}
                                    @endif
                                </td>
                                <td class="text-center">
                                    @if(is_null($node->server_limit))
                                        &mdash;
                                    @else
                                        {{ $node->server_limit }}
                                    @endif
                                </td>
                                <td class="text-center" style="color:{{ ($node->scheme === 'https') ? '#50af51' : '#d9534f' }}"><i class="fa fa-{{ ($node->scheme === 'https') ? 'lock' : 'unlock' }}"></i></td>
                                <td class="text-center"><i class="fa fa-{{ ($node->public) ? 'eye' : 'eye-slash' }}"></i></td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if($nodes->hasPages())
                <div class="box-footer with-border">
                    <div class="col-md-12 text-center">{!! $nodes->appends(['query' => Request::input('query')])->render() !!}</div>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
    // ── Shared helpers ─────────────────────────────────────────────────────
    var _csrfToken = '{{ csrf_token() }}';

    // ── Mass Actions ───────────────────────────────────────────────────────
    @if(Auth::user()->root_admin)
    var _massAppNameUrl    = '{{ route('admin.nodes.mass.app-name') }}';
    var _massWingsCtrlUrl  = '{{ route('admin.nodes.mass.wings-control') }}';

    function massGetSelectedIds() {
        return Array.from(document.querySelectorAll('.ma-node-check:checked'))
                    .map(function(cb) { return parseInt(cb.getAttribute('data-node-id'), 10); });
    }
    function massUpdateUI() {
        var ids   = massGetSelectedIds();
        var count = ids.length;
        var countEl = document.getElementById('ma-selected-count');
        if (countEl) countEl.textContent = count + (count === 1 ? ' node selected' : ' nodes selected');
        var disabled = count === 0;
        ['ma-appname-btn','ma-btn-start','ma-btn-restart','ma-btn-stop'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.disabled = disabled;
        });
        var allCb = document.getElementById('ma-check-all');
        if (allCb) {
            var all = document.querySelectorAll('.ma-node-check');
            allCb.checked       = all.length > 0 && count === all.length;
            allCb.indeterminate = count > 0 && count < all.length;
        }
    }
    function massToggleAll(checked) {
        document.querySelectorAll('.ma-node-check').forEach(function(cb) { cb.checked = checked; });
        massUpdateUI();
    }
    function massSelectAll()   { massToggleAll(true);  }
    function massDeselectAll() { massToggleAll(false); }

    function massApplyAppName() {
        var ids = massGetSelectedIds();
        if (!ids.length) return;
        var appName  = document.getElementById('ma-app-name').value.trim();
        var resultEl = document.getElementById('ma-appname-result');
        var btn      = document.getElementById('ma-appname-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving…';
        if (resultEl) resultEl.innerHTML = '';

        fetch(_massAppNameUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': _csrfToken, 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
            body: JSON.stringify({ node_ids: ids, app_name: appName || null })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa fa-save"></i> Apply to Selected';
            if (resultEl) {
                var errCount = Object.keys(d.errors || {}).length;
                if (errCount > 0) {
                    resultEl.innerHTML = '<span class="text-warning"><i class="fa fa-exclamation-triangle"></i> Updated ' + (d.updated||0) + ' node(s), ' + errCount + ' error(s).</span>';
                } else {
                    resultEl.innerHTML = '<span class="text-success"><i class="fa fa-check"></i> App Name updated on ' + (d.updated||0) + ' node(s).</span>';
                }
            }
        })
        .catch(function(err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa fa-save"></i> Apply to Selected';
            if (resultEl) resultEl.innerHTML = '<span class="text-danger"><i class="fa fa-times"></i> Request failed.</span>';
        });
    }

    function massWingsAction(action) {
        var ids = massGetSelectedIds();
        if (!ids.length) return;
        var resultEl = document.getElementById('ma-wings-result');
        ['ma-btn-start','ma-btn-restart','ma-btn-stop'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.disabled = true;
        });
        if (resultEl) resultEl.innerHTML = '<span class="text-muted"><i class="fa fa-spinner fa-spin"></i> Sending ' + action + ' to ' + ids.length + ' node(s)…</span>';

        fetch(_massWingsCtrlUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': _csrfToken, 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
            body: JSON.stringify({ node_ids: ids, action: action })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            massUpdateUI();
            if (!resultEl) return;
            var results = d.results || {};
            var ok = 0, fail = 0;
            Object.values(results).forEach(function(r) { if (r.success) ok++; else fail++; });
            if (fail > 0) {
                resultEl.innerHTML = '<span class="text-warning"><i class="fa fa-exclamation-triangle"></i> ' + action + ': ' + ok + ' OK, ' + fail + ' failed.</span>';
            } else {
                resultEl.innerHTML = '<span class="text-success"><i class="fa fa-check"></i> ' + action.charAt(0).toUpperCase() + action.slice(1) + ' sent to ' + ok + ' node(s).</span>';
            }
        })
        .catch(function(err) {
            massUpdateUI();
            if (resultEl) resultEl.innerHTML = '<span class="text-danger"><i class="fa fa-times"></i> Request failed.</span>';
        });
    }

    // Attach checkbox change listeners once DOM is ready
    $(document).ready(function() {
        $(document).on('change', '.ma-node-check', massUpdateUI);
        massUpdateUI();
    });
    @endif

    function makeUpdateSection(opts) {
        fetch(opts.versionsUrl)
        .then(function(r) { return r.json(); })
        .then(function(nodes) {
            var outdated = nodes.filter(function(n) { return !n.up_to_date && n.current_version; });
            if (outdated.length === 0) return;

            $('#' + opts.sectionId).show();
            var body   = $('#' + opts.bodyId);
            var allBtn = $('#' + opts.allBtnId);

            var html = '<table class="table table-condensed no-margin">';
            html += '<thead><tr><th>Node</th><th>Running</th><th>Latest</th><th style="width:130px;"></th></tr></thead><tbody>';
            outdated.forEach(function(info) {
                html += '<tr>';
                html += '<td><a href="/admin/nodes/view/' + info.node_id + '">' + $('<span>').text(info.node_name).html() + '</a></td>';
                html += '<td><span class="label label-warning">' + $('<span>').text(info.current_version).html() + '</span></td>';
                html += '<td><span class="label label-success">' + $('<span>').text(info.latest_version).html() + '</span></td>';
                html += '<td>';
                html += '<button class="btn btn-xs ' + opts.btnClass + ' ' + opts.sectionId + '-single-btn"'
                      + ' data-node-id="' + info.node_id + '" data-node-name="' + $('<span>').text(info.node_name).html() + '">'
                      + '<i class="fa fa-upload"></i> Update</button>';
                html += '</td></tr>';
            });
            html += '</tbody></table>';
            body.html(html);
            allBtn.show();

            function doTrigger(nodeId, btn) {
                var url = opts.updateUrlTemplate.replace('{NODE_ID}', nodeId);
                if (!url) return;
                btn.disabled = true;
                btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Updating&hellip;';
                fetch(url, { method: 'POST', headers: { 'X-CSRF-TOKEN': _csrfToken, 'Content-Type': 'application/json' } })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.error) {
                        btn.innerHTML = '<i class="fa fa-times"></i> Error';
                        btn.title = data.error;
                        btn.disabled = false;
                    } else {
                        btn.innerHTML = '<i class="fa fa-check"></i> Updated';
                        btn.className = btn.className.replace(opts.btnClass, 'btn-success');
                    }
                }).catch(function() {
                    btn.innerHTML = '<i class="fa fa-times"></i> Failed';
                    btn.disabled = false;
                });
            }

            body.on('click', '.' + opts.sectionId + '-single-btn', function() {
                doTrigger(parseInt($(this).data('node-id')), this);
            });

            allBtn.off('click').on('click', function() {
                allBtn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin"></i> Updating all&hellip;');
                var pending = outdated.slice();
                (function doNext() {
                    if (!pending.length) {
                        allBtn.html('<i class="fa fa-check"></i> All updated').removeClass(opts.btnClass).addClass('btn-success');
                        return;
                    }
                    var info   = pending.shift();
                    var rowBtn = body.find('.' + opts.sectionId + '-single-btn[data-node-id="' + info.node_id + '"]').get(0)
                               || document.createElement('button');
                    doTrigger(info.node_id, rowBtn);
                    setTimeout(doNext, 1500);
                })();
            });
        })
        .catch(function() {
            $('#' + opts.bodyId).html('<span class="text-danger"><i class="fa fa-times"></i> Failed to check versions.</span>');
        });
    }

    // ── Wings Agent Update Checker ─────────────────────────────────────────
    (function() {
        $(document).ready(function() {
            makeUpdateSection({
                versionsUrl:       '{{ route('admin.nodes.wings-agent.versions') }}',
                updateUrlTemplate: '/admin/nodes/view/{NODE_ID}/wings-agent/update',
                sectionId:         'wings-update-section',
                bodyId:            'wings-update-body',
                allBtnId:          'wings-update-all-btn',
                btnClass:          'btn-warning',
            });
        });
    })();

    // ── Pterodactyl Wings Daemon Update Checker ────────────────────────────
    (function() {
        $(document).ready(function() {
            makeUpdateSection({
                versionsUrl:       '{{ route('admin.nodes.wings-daemon.versions') }}',
                updateUrlTemplate: '/admin/nodes/view/{NODE_ID}/wings-daemon/update',
                sectionId:         'wings-daemon-update-section',
                bodyId:            'wings-daemon-update-body',
                allBtnId:          'wings-daemon-update-all-btn',
                btnClass:          'btn-danger',
            });
        });
    })();

    // ── Node Heartbeat Ping ────────────────────────────────────────────────
    (function pingNodes() {
        $('td[data-action="ping"]').each(function(i, element) {
            $.ajax({
                type: 'GET',
                url: $(element).data('location'),
                headers: { 'Authorization': 'Bearer ' + $(element).data('secret') },
                timeout: 5000
            }).done(function(data) {
                $(element).find('i').tooltip({ title: 'v' + data.version });
                $(element).removeClass('text-muted').find('i').removeClass().addClass('fa fa-fw fa-heartbeat faa-pulse animated').css('color', '#50af51');
            }).fail(function(error) {
                var errorText = 'Error connecting to node! Check browser console for details.';
                try { errorText = error.responseJSON.errors[0].detail || errorText; } catch(ex) {}
                $(element).removeClass('text-muted').find('i').removeClass().addClass('fa fa-fw fa-heart-o').css('color', '#d9534f');
                $(element).find('i').tooltip({ title: errorText });
            });
        }).promise().done(function() { setTimeout(pingNodes, 10000); });
    })();

    // ── Node List Drag & Drop Ordering ──────────────────────────────────────
    (function() {
        $('head').append('<style>.sortable-row.dragging { opacity: .5; } .drag-handle { cursor: move; }</style>');

        var dragSrcEl = null;
        var tableBody = document.querySelector('table.table tbody');

        if (!tableBody) {
            return;
        }

        function handleDragStart(e) {
            dragSrcEl = this;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.dataset.nodeId);
            this.classList.add('dragging');
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            var target = e.target.closest('tr');
            if (!target || target === dragSrcEl) {
                return;
            }

            var rect = target.getBoundingClientRect();
            var next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            tableBody.insertBefore(dragSrcEl, next ? target.nextSibling : target);
        }

        function handleDragEnd() {
            this.classList.remove('dragging');
            saveOrder();
        }

        function saveOrder() {
            var order = Array.from(tableBody.querySelectorAll('tr.sortable-row')).map(function(row) {
                return parseInt(row.dataset.nodeId, 10);
            });

            fetch('{{ route('admin.nodes.reorder') }}', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': _csrfToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ order: order })
            }).then(function(response) {
                if (!response.ok) {
                    throw new Error('Failed to save order');
                }
                return response.json();
            }).then(function(result) {
                if (!result.success) {
                    throw new Error('Failed to save order');
                }
            }).catch(function(error) {
                console.error(error);
            });
        }

        tableBody.querySelectorAll('tr.sortable-row').forEach(function(row) {
            row.addEventListener('dragstart', handleDragStart, false);
            row.addEventListener('dragover', handleDragOver, false);
            row.addEventListener('dragend', handleDragEnd, false);
        });
    })();
    </script>
@endsection
