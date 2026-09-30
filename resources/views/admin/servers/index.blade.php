@extends('layouts.admin')

@section('title')
    List Servers
@endsection

@section('content-header')
    <h1>Servers<small>All servers available on the system.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Servers</li>
    </ol>
@endsection

@section('content')

{{-- ══════════════════════════════════════════════════════════════════════════
     MASS ACTIONS SECTION (root_admin only)
     ══════════════════════════════════════════════════════════════════════════ --}}
@if(Auth::user()->root_admin)
<div class="row" id="ma-section">
    <div class="col-xs-12">
        <div class="box box-solid" style="border-color:#3c8dbc;">
            <div class="box-header with-border" style="background:#3c8dbc; color:#fff;">
                <h3 class="box-title" style="color:#fff;"><i class="fa fa-list-ul"></i> Mass Actions</h3>
                <div class="box-tools pull-right">
                    <span id="ma-selected-count" style="font-size:12px; background:rgba(255,255,255,0.2); padding:3px 10px; border-radius:3px; color:#fff;">0 servers selected</span>
                </div>
            </div>
            <div class="box-body">
                <div class="row">

                    {{-- ── Selection helpers ───────────────────────────────── --}}
                    <div class="col-sm-3">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-check-square-o"></i> Selection</h4>
                        <p style="font-size:12px; color:#aaa; margin-bottom:8px;">Use checkboxes in the table below or the shortcuts here.</p>
                        <button class="btn btn-default btn-sm" onclick="maSelectAll()"><i class="fa fa-check-square-o"></i> Select All</button>
                        <button class="btn btn-default btn-sm" onclick="maDeselectAll()"><i class="fa fa-square-o"></i> Deselect All</button>
                    </div>

                    {{-- ── Suspend / Unsuspend ──────────────────────────────── --}}
                    <div class="col-sm-3">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-pause"></i> Suspension</h4>
                        <p style="font-size:12px; color:#aaa; margin-bottom:8px;">Toggle suspension status on selected servers.</p>
                        <div class="btn-group">
                            <button id="ma-btn-suspend" class="btn btn-warning" onclick="maBulkAction('suspend')" disabled>
                                <i class="fa fa-pause"></i> Suspend
                            </button>
                            <button id="ma-btn-unsuspend" class="btn btn-success" onclick="maBulkAction('unsuspend')" disabled>
                                <i class="fa fa-play"></i> Unsuspend
                            </button>
                        </div>
                        <div id="ma-suspend-result" style="margin-top:8px; font-size:12px;"></div>
                    </div>

                    {{-- ── Delete ───────────────────────────────────────────── --}}
                    <div class="col-sm-3">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-trash"></i> Delete</h4>
                        <p style="font-size:12px; color:#aaa; margin-bottom:8px;">Permanently delete selected servers.</p>
                        <div style="margin:0 0 6px 0;">
                            <label style="font-size:12px; font-weight:normal; cursor:pointer;">
                                <input type="checkbox" id="ma-force-delete" style="margin-right:4px;"> Force delete (ignore daemon errors)
                            </label>
                        </div>
                        <button id="ma-btn-delete" class="btn btn-danger" onclick="maConfirmDelete()" disabled>
                            <i class="fa fa-trash"></i> Delete Selected
                        </button>
                        <div id="ma-delete-result" style="margin-top:8px; font-size:12px;"></div>
                    </div>

                    {{-- ── Transfer ─────────────────────────────────────────── --}}
                    <div class="col-sm-3">
                        <h4 style="margin-top:0; color:#555;"><i class="fa fa-exchange"></i> Transfer to Node</h4>
                        <p style="font-size:12px; color:#aaa; margin-bottom:8px;">Move selected servers to a different node via Wings Agent. Allocations are chosen automatically.</p>
                        <select id="ma-transfer-node" class="form-control" style="margin-bottom:6px;">
                            <option value="">— Select destination node —</option>
                            @foreach($nodes as $node)
                                @if(in_array($node->id, $agentNodeIds))
                                <option value="{{ $node->id }}">{{ $node->name }}</option>
                                @endif
                            @endforeach
                        </select>
                        <div style="margin:0 0 6px 0;">
                            <label style="font-size:12px; font-weight:normal; cursor:pointer;">
                                <input type="checkbox" id="ma-transfer-backups" style="margin-right:4px;"> Include native backups
                            </label>
                        </div>
                        <button id="ma-btn-transfer" class="btn btn-primary" onclick="maBulkTransfer()" disabled>
                            <i class="fa fa-exchange"></i> Transfer Selected
                        </button>
                        <div id="ma-transfer-result" style="margin-top:8px; font-size:12px;"></div>
                    </div>

                </div>{{-- /row --}}
            </div>{{-- /box-body --}}
        </div>{{-- /box --}}
    </div>
</div>
@endif

{{-- ══════════════════════════════════════════════════════════════════════════
     SERVER LIST TABLE
     ══════════════════════════════════════════════════════════════════════════ --}}
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Server List</h3>
                <div class="box-tools">
                    <form action="{{ route('admin.servers') }}" method="GET" class="form-inline" style="display: inline-block;">
                        <input type="text" name="filter[*]" value="{{ request('filter.*') }}" placeholder="Search…" class="form-control input-sm">

                        <select name="filter[node_id]" class="form-control input-sm">
                            <option value="">All nodes</option>
                            @foreach($nodes as $node)
                                <option value="{{ $node->id }}" @if(request('filter.node_id') == $node->id) selected @endif>{{ $node->name }}</option>
                            @endforeach
                        </select>

                        <select name="filter[status]" class="form-control input-sm">
                            <option value="">Any status</option>
                            <option value="active" @if(request('filter.status')=='active') selected @endif>Active</option>
                            <option value="suspended" @if(request('filter.status')=='suspended') selected @endif>Suspended</option>
                        </select>

                        <input type="date" name="filter[exp_date]" value="{{ request('filter.exp_date') }}" class="form-control input-sm">

                        <button type="submit" class="btn btn-default btn-sm"><i class="fa fa-search"></i></button>
                    </form>
                    @if(Auth::user()->root_admin || Auth::user()->hasAdminPermission('admin.servers.create'))
                        <a href="{{ route('admin.servers.new') }}"><button type="button" class="btn btn-sm btn-primary">Create New</button></a>
                    @endif
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            @if(Auth::user()->root_admin)
                            <th style="width:36px; vertical-align:middle;">
                                <input type="checkbox" id="ma-check-all" title="Select all on this page" onclick="maToggleAll(this.checked)">
                            </th>
                            @endif
                            <th><a href="{{ route('admin.servers', array_merge(request()->query(), ['sort' => request('sort') === 'name' ? '-name' : 'name'])) }}">Server Name</a></th>
                            <th><a href="{{ route('admin.servers', array_merge(request()->query(), ['sort' => request('sort') === 'uuid' ? '-uuid' : 'uuid'])) }}">UUID</a></th>
                            <th><a href="{{ route('admin.servers', array_merge(request()->query(), ['sort' => request('sort') === 'owner' ? '-owner' : 'owner'])) }}">Owner</a></th>
                            <th><a href="{{ route('admin.servers', array_merge(request()->query(), ['sort' => request('sort') === 'node' ? '-node' : 'node'])) }}">Node</a></th>
                            <th>Connection</th>
                            <th>Type</th>
                            <th><a href="{{ route('admin.servers', array_merge(request()->query(), ['sort' => request('sort') === 'status' ? '-status' : 'status'])) }}">Status</a></th>
                            <th><a href="{{ route('admin.servers', array_merge(request()->query(), ['sort' => request('sort') === 'exp_date' ? '-exp_date' : 'exp_date'])) }}">Expiry</a></th>
                        </tr>
                        @foreach ($servers as $server)
                            <tr data-server="{{ $server->uuidShort }}">
                                @if(Auth::user()->root_admin)
                                <td class="text-center" style="vertical-align:middle;">
                                    <input type="checkbox" class="ma-server-check"
                                           data-server-id="{{ $server->id }}"
                                           data-server-name="{{ $server->name }}">
                                </td>
                                @endif
                                <td><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></td>
                                <td><code title="{{ $server->uuid }}">{{ $server->uuid }}</code></td>
                                <td><a href="{{ route('admin.users.view', $server->user->id) }}">{{ $server->user->username }}</a></td>
                                <td><a href="{{ route('admin.nodes.view', $server->node->id) }}">{{ $server->node->name }}</a></td>
                                <td>
                                    <code>{{ $server->allocation->alias }}:{{ $server->allocation->port }}</code>
                                </td>
                                <td>
                                    @if($server->subSplit)
                                        <span class="label label-warning">Sub-Server</span>
                                    @elseif($server->splits->isNotEmpty())
                                        <span class="label label-info">Master Server</span>
                                    @else
                                        <span class="label label-default">Standard</span>
                                    @endif
                                </td>
                                <td class="text-center">
                                    @if($server->isSuspended())
                                        <span class="label bg-maroon">Suspended</span>
                                    @elseif(! $server->isInstalled())
                                        <span class="label label-warning">Installing</span>
                                    @else
                                        <span class="label label-success">Active</span>
                                    @endif
                                </td>
                                <td class="text-center">
                                    <a class="btn btn-xs btn-default" href="/server/{{ $server->uuidShort }}"><i class="fa fa-wrench"></i></a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if($servers->hasPages())
                <div class="box-footer with-border">
                    <div class="col-md-12 text-center">{!! $servers->appends(['filter' => Request::input('filter'), 'sort' => Request::input('sort')])->render() !!}</div>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
        $('.console-popout').on('click', function (event) {
            event.preventDefault();
            window.open($(this).attr('href'), 'Pterodactyl Console', 'width=800,height=400');
        });

        @if(Auth::user()->root_admin)
        // ── Mass Actions ─────────────────────────────────────────────────────────
        var _csrfToken       = '{{ csrf_token() }}';
        var _maActionUrl     = '{{ route('admin.servers.mass.action') }}';
        var _maTransferUrl   = '{{ route('admin.servers.mass.transfer') }}';

        function maGetSelectedIds() {
            return Array.from(document.querySelectorAll('.ma-server-check:checked'))
                        .map(function(cb) { return parseInt(cb.getAttribute('data-server-id'), 10); });
        }

        function maUpdateUI() {
            var ids      = maGetSelectedIds();
            var count    = ids.length;
            var disabled = count === 0;

            var countEl = document.getElementById('ma-selected-count');
            if (countEl) countEl.textContent = count + (count === 1 ? ' server selected' : ' servers selected');

            ['ma-btn-suspend', 'ma-btn-unsuspend', 'ma-btn-delete', 'ma-btn-transfer'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.disabled = disabled;
            });

            var allCb = document.getElementById('ma-check-all');
            if (allCb) {
                var all = document.querySelectorAll('.ma-server-check');
                allCb.checked       = all.length > 0 && count === all.length;
                allCb.indeterminate = count > 0 && count < all.length;
            }
        }

        function maToggleAll(checked) {
            document.querySelectorAll('.ma-server-check').forEach(function(cb) { cb.checked = checked; });
            maUpdateUI();
        }

        function maSelectAll()   { maToggleAll(true);  }
        function maDeselectAll() { maToggleAll(false); }

        function maBulkAction(action) {
            var ids = maGetSelectedIds();
            if (!ids.length) return;

            var label      = action === 'suspend' ? 'Suspending' : 'Unsuspending';
            var resultEl   = document.getElementById('ma-suspend-result');
            var btnSuspend = document.getElementById('ma-btn-suspend');
            var btnUnsusp  = document.getElementById('ma-btn-unsuspend');

            btnSuspend.disabled = true;
            btnUnsusp.disabled  = true;
            if (resultEl) resultEl.innerHTML = '<span class="text-muted"><i class="fa fa-spinner fa-spin"></i> ' + label + ' ' + ids.length + ' server(s)&hellip;</span>';

            fetch(_maActionUrl, {
                method:  'POST',
                headers: {
                    'Content-Type':     'application/json',
                    'X-CSRF-TOKEN':     _csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept':           'application/json',
                },
                body: JSON.stringify({ server_ids: ids, action: action }),
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                maUpdateUI();
                if (!resultEl) return;
                if ((d.fail || 0) > 0) {
                    resultEl.innerHTML = '<span class="text-warning"><i class="fa fa-exclamation-triangle"></i> '
                        + (d.ok || 0) + ' OK, ' + d.fail + ' failed.</span>';
                } else {
                    var past = action === 'suspend' ? 'Suspended' : 'Unsuspended';
                    resultEl.innerHTML = '<span class="text-success"><i class="fa fa-check"></i> '
                        + past + ' ' + (d.ok || 0) + ' server(s) successfully.</span>';
                    // Reload after short delay so statuses refresh
                    setTimeout(function() { window.location.reload(); }, 1500);
                }
            })
            .catch(function() {
                maUpdateUI();
                if (resultEl) resultEl.innerHTML = '<span class="text-danger"><i class="fa fa-times"></i> Request failed.</span>';
            });
        }

        function maConfirmDelete() {
            var ids = maGetSelectedIds();
            if (!ids.length) return;
            var names = Array.from(document.querySelectorAll('.ma-server-check:checked'))
                             .map(function(cb) { return cb.getAttribute('data-server-name'); });
            var force = document.getElementById('ma-force-delete').checked;
            var msg   = 'You are about to permanently delete ' + ids.length + ' server(s):\n\n'
                      + names.slice(0, 10).join('\n')
                      + (names.length > 10 ? '\n… and ' + (names.length - 10) + ' more' : '')
                      + '\n\nThis action cannot be undone. Continue?';
            if (!confirm(msg)) return;
            maDeleteSelected(ids, force);
        }

        function maDeleteSelected(ids, force) {
            var resultEl  = document.getElementById('ma-delete-result');
            var btnDelete = document.getElementById('ma-btn-delete');

            btnDelete.disabled = true;
            btnDelete.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Deleting&hellip;';
            if (resultEl) resultEl.innerHTML = '<span class="text-muted"><i class="fa fa-spinner fa-spin"></i> Deleting ' + ids.length + ' server(s)&hellip;</span>';

            fetch(_maActionUrl, {
                method:  'POST',
                headers: {
                    'Content-Type':     'application/json',
                    'X-CSRF-TOKEN':     _csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept':           'application/json',
                },
                body: JSON.stringify({ server_ids: ids, action: 'delete', force_delete: force }),
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                btnDelete.disabled  = false;
                btnDelete.innerHTML = '<i class="fa fa-trash"></i> Delete Selected';
                if (!resultEl) return;
                if ((d.fail || 0) > 0) {
                    resultEl.innerHTML = '<span class="text-warning"><i class="fa fa-exclamation-triangle"></i> '
                        + (d.ok || 0) + ' deleted, ' + d.fail + ' failed.</span>';
                    if (d.ok > 0) setTimeout(function() { window.location.reload(); }, 2000);
                } else {
                    resultEl.innerHTML = '<span class="text-success"><i class="fa fa-check"></i> '
                        + (d.ok || 0) + ' server(s) deleted successfully.</span>';
                    setTimeout(function() { window.location.reload(); }, 1500);
                }
            })
            .catch(function() {
                btnDelete.disabled  = false;
                btnDelete.innerHTML = '<i class="fa fa-trash"></i> Delete Selected';
                if (resultEl) resultEl.innerHTML = '<span class="text-danger"><i class="fa fa-times"></i> Request failed.</span>';
            });
        }

        function maBulkTransfer() {
            var ids    = maGetSelectedIds();
            var nodeId = document.getElementById('ma-transfer-node').value;
            if (!ids.length) return;
            if (!nodeId) {
                alert('Please select a destination node first.');
                return;
            }

            var includeBackups = document.getElementById('ma-transfer-backups').checked;
            var resultEl       = document.getElementById('ma-transfer-result');
            var btnTransfer    = document.getElementById('ma-btn-transfer');

            btnTransfer.disabled = true;
            btnTransfer.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Initiating&hellip;';
            if (resultEl) resultEl.innerHTML = '<span class="text-muted"><i class="fa fa-spinner fa-spin"></i> '
                + 'Initiating transfer for ' + ids.length + ' server(s)&hellip;</span>';

            fetch(_maTransferUrl, {
                method:  'POST',
                headers: {
                    'Content-Type':     'application/json',
                    'X-CSRF-TOKEN':     _csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept':           'application/json',
                },
                body: JSON.stringify({
                    server_ids:              ids,
                    node_id:                 parseInt(nodeId, 10),
                    include_native_backups:  includeBackups,
                }),
            })
            .then(function(r) { return r.json(); })
            .then(function(d) {
                btnTransfer.disabled  = false;
                btnTransfer.innerHTML = '<i class="fa fa-exchange"></i> Transfer Selected';
                if (!resultEl) return;
                if (d.error) {
                    resultEl.innerHTML = '<span class="text-danger"><i class="fa fa-times"></i> '
                        + d.error + '</span>';
                    return;
                }
                if ((d.fail || 0) > 0) {
                    var failDetails = '';
                    if (d.results) {
                        Object.entries(d.results).forEach(function([sid, r]) {
                            if (!r.success) failDetails += '<br><small>Server #' + sid + ': ' + (r.error || 'unknown error') + '</small>';
                        });
                    }
                    resultEl.innerHTML = '<span class="text-warning"><i class="fa fa-exclamation-triangle"></i> '
                        + (d.ok || 0) + ' transfer(s) started, ' + d.fail + ' failed.' + failDetails + '</span>';
                } else {
                    resultEl.innerHTML = '<span class="text-success"><i class="fa fa-check"></i> '
                        + (d.ok || 0) + ' transfer(s) initiated successfully. '
                        + 'Monitor progress in each server\'s manage page.</span>';
                }
            })
            .catch(function() {
                btnTransfer.disabled  = false;
                btnTransfer.innerHTML = '<i class="fa fa-exchange"></i> Transfer Selected';
                if (resultEl) resultEl.innerHTML = '<span class="text-danger"><i class="fa fa-times"></i> Request failed.</span>';
            });
        }

        // Wire checkbox listeners
        $(document).ready(function() {
            $(document).on('change', '.ma-server-check', maUpdateUI);
            maUpdateUI();
        });
        @endif
    </script>
@endsection
