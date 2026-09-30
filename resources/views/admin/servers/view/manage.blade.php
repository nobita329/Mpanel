@extends('layouts.admin')

@section('title')
    Server — {{ $server->name }}: Manage
@endsection

@section('content-header')
    <h1>{{ $server->name }}<small>Additional actions to control this server.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.servers') }}">Servers</a></li>
        <li><a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a></li>
        <li class="active">Manage</li>
    </ol>
@endsection

@section('content')
    @include('admin.servers.partials.navigation')
    <div class="row">
        <div class="col-sm-4">
            <div class="box box-danger">
                <div class="box-header with-border">
                    <h3 class="box-title">Reinstall Server</h3>
                </div>
                <div class="box-body">
                    <p>This will reinstall the server with the assigned service scripts. <strong>Danger!</strong> This could overwrite server data.</p>
                </div>
                <div class="box-footer">
                    @if($server->isInstalled())
                        <form action="{{ route('admin.servers.view.manage.reinstall', $server->id) }}" method="POST">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-danger">Reinstall Server</button>
                        </form>
                    @else
                        <button class="btn btn-danger disabled">Server Must Install Properly to Reinstall</button>
                    @endif
                </div>
            </div>
        </div>
        <div class="col-sm-4">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">Install Status</h3>
                </div>
                <div class="box-body">
                    <p>If you need to change the install status from uninstalled to installed, or vice versa, you may do so with the button below.</p>
                </div>
                <div class="box-footer">
                    <form action="{{ route('admin.servers.view.manage.toggle', $server->id) }}" method="POST">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-primary">Toggle Install Status</button>
                    </form>
                </div>
            </div>
        </div>

        @if(! $server->isSuspended())
            <div class="col-sm-4">
                <div class="box box-warning">
                    <div class="box-header with-border">
                        <h3 class="box-title">Suspend Server</h3>
                    </div>
                    <div class="box-body">
                        <p>This will suspend the server, stop any running processes, and immediately block the user from being able to access their files or otherwise manage the server through the panel or API.</p>
                    </div>
                    <div class="box-footer">
                        <form action="{{ route('admin.servers.view.manage.suspension', $server->id) }}" method="POST">
                            {!! csrf_field() !!}
                            <input type="hidden" name="action" value="suspend" />
                            <button type="submit" class="btn btn-warning @if(! is_null($server->transfer)) disabled @endif">Suspend Server</button>
                        </form>
                    </div>
                </div>
            </div>
        @else
            <div class="col-sm-4">
                <div class="box box-success">
                    <div class="box-header with-border">
                        <h3 class="box-title">Unsuspend Server</h3>
                    </div>
                    <div class="box-body">
                        <p>This will unsuspend the server and restore normal user access.</p>
                    </div>
                    <div class="box-footer">
                        <form action="{{ route('admin.servers.view.manage.suspension', $server->id) }}" method="POST">
                            {!! csrf_field() !!}
                            <input type="hidden" name="action" value="unsuspend" />
                            <button type="submit" class="btn btn-success">Unsuspend Server</button>
                        </form>
                    </div>
                </div>
            </div>
        @endif

        @if(is_null($server->transfer))
            <div class="col-sm-4">
                <div class="box box-success">
                    <div class="box-header with-border">
                        <h3 class="box-title">Transfer Server</h3>
                    </div>
                    <div class="box-body">
                        <p>
                            Transfer this server to another node connected to this panel.
                            <strong>Warning!</strong> This feature has not been fully tested and may have bugs.
                        </p>
                    </div>

                    <div class="box-footer">
                        @if($canTransfer)
                            <button class="btn btn-success" data-toggle="modal" data-target="#transferServerModal">Transfer Server</button>
                        @else
                            <button class="btn btn-success disabled">Transfer Server</button>
                            <p style="padding-top: 1rem;">Transferring a server requires more than one node to be configured on your panel.</p>
                        @endif
                    </div>
                </div>
            </div>
        @else
            <div class="col-sm-4">
                <div class="box box-warning">
                    <div class="box-header with-border">
                        <h3 class="box-title">Transfer Server (Native)</h3>
                    </div>
                    <div class="box-body">
                        <p>
                            This server is currently being transferred to another node via the <strong>native transfer system</strong>.
                            Transfer was initiated at <strong>{{ $server->transfer->created_at }}</strong>
                        </p>
                    </div>

                    <div class="box-footer">
                        <form action="{{ route('admin.servers.view.manage.transfer.force-clear', $server->id) }}" method="POST"
                              onsubmit="return confirm('Cancel this native transfer? The server will be reverted to its original node and the transfer will be aborted.');">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-danger btn-sm">
                                <i class="fa fa-times-circle"></i> Cancel Native Transfer
                            </button>
                            <span class="text-muted small" style="margin-left:10px;">Cancels the Pterodactyl native transfer and resets the server status.</span>
                        </form>
                    </div>
                </div>
            </div>
        @endif
    </div>

    {{-- Transfer Status Detail (only shown when an active AgentServerTransfer exists) --}}
    @if(!is_null($agentTransfer))
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-warning">
                <div class="box-header with-border">
                    <h3 class="box-title"><i class="fa fa-exchange"></i> Transfer Status</h3>
                </div>
                <div class="box-body" id="transfer-status-body">
                    @php
                        $xfer = $agentTransfer;
                        $statusColors = [
                            'pending'                 => 'label-default',
                            'preparing'               => 'label-info',
                            'transferring'            => 'label-primary',
                            'verifying'               => 'label-warning',
                            'completing'              => 'label-warning',
                            'completed'               => 'label-success',
                            'awaiting_source_cleanup' => 'label-warning',
                            'failed'                  => 'label-danger',
                            'cancelled'               => 'label-default',
                        ];
                        $labelClass = $statusColors[$xfer->status] ?? 'label-default';
                        $phaseColors = [
                            'pending'      => 'label-default',
                            'staging'      => 'label-info',
                            'downloading'  => 'label-primary',
                            'extracting'   => 'label-warning',
                            'completing'   => 'label-success',
                            'waiting_manifest' => 'label-info',
                        ];
                        $phase = !empty($xfer->phase) ? $xfer->phase : $xfer->status;
                        $phaseLabelClass = $phaseColors[$phase] ?? 'label-default';
                        $bytesXferred = $xfer->bytes_transferred ?? 0;
                        $bytesTotal   = $xfer->total_bytes ?? 0;
                        // Show 100% for terminal-success statuses even if total_bytes was never populated
                        $pct = in_array($xfer->status, ['completed', 'awaiting_source_cleanup'])
                            ? 100
                            : ($bytesTotal > 0 ? round($bytesXferred / $bytesTotal * 100, 1) : 0);
                        $filesCompleted = $xfer->files_completed ?? ($xfer->chunks_completed ?? 0);
                        $filesTotal     = $xfer->total_files ?? ($xfer->total_chunks ?? 0);
                        $filesFailed    = $xfer->files_failed ?? 0;
                        $currentFile    = $xfer->current_file ?? null;
                        $activeStatuses = ['pending', 'preparing', 'transferring', 'verifying', 'completing'];
                        $sourceNode = $xfer->sourceNode ?? null;
                        $destNode   = $xfer->destNode   ?? null;
                        $formatBytes = function(int $b): string {
                            if ($b >= 1073741824) return round($b / 1073741824, 2) . ' GB';
                            if ($b >= 1048576)    return round($b / 1048576,    2) . ' MB';
                            if ($b >= 1024)       return round($b / 1024,       1) . ' KB';
                            return $b . ' B';
                        };
                        $isAwaitingCleanup = strtolower(trim((string)($xfer->status ?? ''))) === 'awaiting_source_cleanup';
                    @endphp

                    <div class="row" style="margin-bottom:10px;">
                        <div class="col-sm-3"><strong>Status</strong></div>
                        <div class="col-sm-9"><span id="xfer-status" class="label {{ $labelClass }}">{{ strtoupper($xfer->status) }}</span></div>
                    </div>
                    <div class="row" style="margin-bottom:10px;" id="xfer-phase-row" @if(empty($xfer->phase) || $xfer->phase === $xfer->status) style="display:none;margin-bottom:10px;" @endif>
                        <div class="col-sm-3"><strong>Phase</strong></div>
                        <div class="col-sm-9"><span id="xfer-phase" class="label {{ $phaseLabelClass }}">{{ strtoupper($phase) }}</span></div>
                    </div>
                    @if($xfer->status)
                    <div class="row" style="margin-bottom:10px;">
                        <div class="col-sm-3"><strong>Transfer ID</strong></div>
                        <div class="col-sm-9"><code>{{ $xfer->transfer_id ?? '—' }}</code></div>
                    </div>
                    @endif
                    <div class="row" style="margin-bottom:10px;">
                        <div class="col-sm-3"><strong>Source Node</strong></div>
                        <div class="col-sm-9">{{ $sourceNode ? $sourceNode->name : ('Node #' . $xfer->source_node_id) }}</div>
                    </div>
                    <div class="row" style="margin-bottom:10px;">
                        <div class="col-sm-3"><strong>Destination Node</strong></div>
                        <div class="col-sm-9">{{ $destNode ? $destNode->name : ('Node #' . $xfer->dest_node_id) }}</div>
                    </div>
                    <div class="row" style="margin-bottom:10px;" id="xfer-progress-row">
                        <div class="col-sm-3"><strong>Progress</strong></div>
                        <div class="col-sm-9">
                            <div class="progress" style="margin-bottom:4px;">
                                <div id="xfer-progress-bar" class="progress-bar progress-bar-striped {{ in_array($xfer->status, $activeStatuses) ? 'active' : '' }}"
                                     role="progressbar"
                                     style="min-width:2em;width:{{ $pct }}%">{{ $pct }}%</div>
                            </div>
                            <span id="xfer-bytes-display">{{ $formatBytes($bytesXferred) }} / {{ $formatBytes($bytesTotal) }}</span>
                            <span id="xfer-files-display">
                                @if($filesTotal > 0)
                                    &nbsp;&mdash;&nbsp;{{ $filesCompleted }}/{{ $filesTotal }} files
                                    @if($filesFailed > 0)
                                        <span class="text-danger">({{ $filesFailed }} failed)</span>
                                    @endif
                                @endif
                            </span>
                            <span id="xfer-speed-display" style="margin-left:8px;color:#888;"></span>
                        </div>
                    </div>
                    <div class="row" style="margin-bottom:10px;" id="xfer-current-file-row" @if(!$currentFile) style="display:none;margin-bottom:10px;" @endif>
                        <div class="col-sm-3"><strong>Current File</strong></div>
                        <div class="col-sm-9"><code id="xfer-current-file" style="font-size:11px;">{{ $currentFile ? Str::limit($currentFile, 80) : '' }}</code></div>
                    </div>
                    <div class="row" style="margin-bottom:10px;">
                        <div class="col-sm-3"><strong>Started</strong></div>
                        <div class="col-sm-9" id="xfer-started">{{ $xfer->started_at ?? $xfer->created_at }}</div>
                    </div>
                    <div class="row" style="margin-bottom:10px;" id="xfer-completed-row" @if(!$xfer->completed_at) style="display:none;margin-bottom:10px;" @endif>
                        <div class="col-sm-3"><strong>Completed</strong></div>
                        <div class="col-sm-9" id="xfer-completed">{{ $xfer->completed_at }}</div>
                    </div>
                    <div class="row" style="margin-bottom:10px;" id="xfer-error-row" @if(empty($xfer->error_message)) style="display:none;margin-bottom:10px;" @endif>
                        <div class="col-sm-3"><strong>Error</strong></div>
                        <div class="col-sm-9 text-danger" id="xfer-error">{{ $xfer->error_message }}</div>
                    </div>

                    {{--
                        Cleanup confirmation section: ALWAYS rendered in the DOM so the JS polling can
                        reveal it without a page reload when the status transitions to
                        awaiting_source_cleanup while the admin is watching the page.
                    --}}
                    <div id="cleanup-section" style="display:{{ $isAwaitingCleanup ? 'block' : 'none' }};">
                        <hr style="margin: 16px 0 12px;">
                        <div class="row" style="margin-bottom:6px;">
                            <div class="col-sm-12">
                                <h4 style="margin:0 0 6px;"><i class="fa fa-check-circle text-success"></i> Transfer Complete &mdash; Verify Before Source Cleanup</h4>
                                <p class="text-muted" style="margin-bottom:10px;">Files have been copied to the destination node. The <strong>source data has not been deleted yet</strong>. Verify the counts below, then confirm deletion.</p>
                            </div>
                        </div>
                        <table class="table table-bordered table-condensed" style="margin-bottom:10px;">
                            <thead>
                                <tr>
                                    <th style="width:120px;"></th>
                                    <th id="cv-src-node-header">Source &mdash; <em>{{ $sourceNode ? $sourceNode->name : 'Node #'.$xfer->source_node_id }}</em></th>
                                    <th>Destination &mdash; <em>{{ $destNode ? $destNode->name : 'Node #'.$xfer->dest_node_id }}</em></th>
                                    <th style="width:90px;text-align:center;">Match</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Files</strong></td>
                                    <td id="cv-src-files">{{ number_format($xfer->total_files ?? 0) }}</td>
                                    <td id="cv-dst-files"><i class="fa fa-spinner fa-spin text-muted"></i> Checking&hellip;</td>
                                    <td id="cv-files-match" style="text-align:center;">—</td>
                                </tr>
                                <tr>
                                    <td><strong>Total Size</strong></td>
                                    <td id="cv-src-bytes">{{ $formatBytes((int)($xfer->total_bytes ?? 0)) }}</td>
                                    <td id="cv-dst-bytes"><i class="fa fa-spinner fa-spin text-muted"></i> Checking&hellip;</td>
                                    <td id="cv-bytes-match" style="text-align:center;">—</td>
                                </tr>
                            </tbody>
                        </table>
                        <p class="text-muted small" style="margin-bottom:10px;">
                            Source file count is taken from the transfer manifest. Destination totals include the live volume plus transferred native backup archives when backup transfer is enabled.
                        </p>
                        <div id="cleanup-verify-error" class="alert alert-danger" style="display:none;margin-bottom:0;"></div>
                        <div id="cleanup-verify-ok" class="alert alert-success" style="display:none;margin-bottom:0;"></div>
                    </div>

                </div>
                @if(in_array($xfer->status, $activeStatuses))
                <script>
                (function() {
                    var pollUrl = '{{ route('admin.servers.view.manage.transfer.progress', $server->id) }}';
                    var terminalStatuses = ['completed', 'failed', 'cancelled', 'awaiting_source_cleanup'];
                    var lastBytesXferred = {{ $bytesXferred }};
                    var lastPollTime = Date.now();
                    // Expose src stats so the cleanup reveal code (below) can update them from poll data
                    window.xferSrcFiles = {{ (int)($xfer->total_files ?? 0) }};
                    window.xferSrcBytes = {{ (int)($xfer->total_bytes ?? 0) }};
                    var xferSrcFiles = window.xferSrcFiles;
                    var xferSrcBytes = window.xferSrcBytes;
                    var statusColors = {
                        'pending': 'label-default', 'preparing': 'label-info', 'transferring': 'label-primary',
                        'verifying': 'label-warning', 'completing': 'label-warning', 'completed': 'label-success',
                        'awaiting_source_cleanup': 'label-warning',
                        'failed': 'label-danger', 'cancelled': 'label-default'
                    };
                    var phaseColors = {
                        'pending': 'label-default', 'staging': 'label-info', 'downloading': 'label-primary',
                        'extracting': 'label-warning', 'completing': 'label-success', 'waiting_manifest': 'label-info'
                    };

                    function formatBytes(b) {
                        if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB';
                        if (b >= 1048576) return (b / 1048576).toFixed(2) + ' MB';
                        if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
                        return b + ' B';
                    }

                    function formatDuration(sec) {
                        if (sec < 60) return sec + 's';
                        if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
                        return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
                    }

                    function pollProgress() {
                        fetch(pollUrl, {credentials: 'same-origin'})
                            .then(function(r) { return r.json(); })
                            .then(function(d) {
                                if (d.error) return;
                                var now = Date.now();
                                var elapsed = (now - lastPollTime) / 1000;

                                // Status
                                var statusEl = document.getElementById('xfer-status');
                                statusEl.textContent = (d.status || '').toUpperCase();
                                statusEl.className = 'label ' + (statusColors[d.status] || 'label-default');

                                // Phase
                                var phaseRow = document.getElementById('xfer-phase-row');
                                var phaseEl = document.getElementById('xfer-phase');
                                if (d.phase && d.phase !== d.status) {
                                    phaseRow.style.display = '';
                                    phaseEl.textContent = d.phase.toUpperCase();
                                    phaseEl.className = 'label ' + (phaseColors[d.phase] || 'label-default');
                                } else {
                                    phaseRow.style.display = 'none';
                                }

                                // Progress bar
                                var bar = document.getElementById('xfer-progress-bar');
                                var pct = d.progress_pct || 0;
                                bar.style.width = pct + '%';
                                bar.textContent = pct + '%';
                                if (terminalStatuses.indexOf(d.status) >= 0) {
                                    bar.classList.remove('active');
                                } else {
                                    bar.classList.add('active');
                                }

                                // Bytes
                                var bytesEl = document.getElementById('xfer-bytes-display');
                                bytesEl.textContent = formatBytes(d.bytes_transferred) + ' / ' + formatBytes(d.total_bytes);

                                // Files
                                var filesEl = document.getElementById('xfer-files-display');
                                if (d.total_files > 0) {
                                    var filesText = ' — ' + d.files_completed + '/' + d.total_files + ' files';
                                    if (d.files_failed > 0) filesText += ' (' + d.files_failed + ' failed)';
                                    filesEl.innerHTML = filesText;
                                } else {
                                    filesEl.textContent = '';
                                }

                                // Speed + ETA
                                var speedEl = document.getElementById('xfer-speed-display');
                                if (elapsed > 0 && d.bytes_transferred > 0) {
                                    var byteDelta = d.bytes_transferred - lastBytesXferred;
                                    if (byteDelta > 0 && elapsed > 0.5) {
                                        var speed = byteDelta / elapsed;
                                        var remaining = d.total_bytes - d.bytes_transferred;
                                        var eta = speed > 0 ? Math.ceil(remaining / speed) : 0;
                                        var text = formatBytes(speed) + '/s';
                                        if (remaining > 0 && eta > 0) text += ' — ~' + formatDuration(eta) + ' remaining';
                                        speedEl.textContent = text;
                                    }
                                } else {
                                    speedEl.textContent = '';
                                }
                                lastBytesXferred = d.bytes_transferred;
                                lastPollTime = now;

                                // Current file
                                var cfRow = document.getElementById('xfer-current-file-row');
                                var cfEl = document.getElementById('xfer-current-file');
                                if (d.current_file) {
                                    cfRow.style.display = '';
                                    cfEl.textContent = d.current_file.length > 80 ? d.current_file.substr(0, 80) + '…' : d.current_file;
                                } else {
                                    cfRow.style.display = 'none';
                                }

                                // Completed / Error
                                if (d.completed_at) {
                                    document.getElementById('xfer-completed-row').style.display = '';
                                    document.getElementById('xfer-completed').textContent = d.completed_at;
                                }
                                if (d.error_message) {
                                    document.getElementById('xfer-error-row').style.display = '';
                                    document.getElementById('xfer-error').textContent = d.error_message;
                                }

                                // Stop polling on terminal status
                                if (terminalStatuses.indexOf(d.status) >= 0) {
                                    // If now awaiting cleanup, reveal the confirm section without a reload
                                    if (d.status === 'awaiting_source_cleanup') {
                                        // Update source stats from polling response (may be more accurate)
                                        if (d.total_files > 0) {
                                            xferSrcFiles = d.total_files;
                                            document.getElementById('cv-src-files').textContent = d.total_files.toLocaleString();
                                        }
                                        if (d.total_bytes > 0) {
                                            xferSrcBytes = d.total_bytes;
                                            document.getElementById('cv-src-bytes').textContent = formatBytes(d.total_bytes);
                                        }
                                        document.getElementById('cleanup-section').style.display = '';
                                        document.getElementById('cleanup-footer').style.display = '';
                                        document.getElementById('force-disable-footer').style.display = 'none';
                                        if (typeof window.verifyDestFiles === 'function') {
                                            window.verifyDestFiles();
                                        }
                                    } else {
                                        // For completed/failed/cancelled, reload to update full page state
                                        setTimeout(function() { location.reload(); }, 2000);
                                    }
                                    return;
                                }

                                setTimeout(pollProgress, 2000);
                            })
                            .catch(function() {
                                setTimeout(pollProgress, 5000);
                            });
                    }

                    setTimeout(pollProgress, 2000);
                })();
                </script>
                @endif
                {{--
                    The verify-and-delete scripts are ALWAYS rendered so that when the JS polling
                    reveals the cleanup section (without a page reload), the functions are available.
                    They are safe to include even when not yet in awaiting_source_cleanup state.
                --}}
                <script>
                (function() {
                    var verifyUrl = '{{ route('admin.servers.view.manage.transfer.verify-dest', $server->id) }}';
                    var deleteUrl = '{{ route('admin.servers.view.manage.transfer.confirm-delete-source', $server->id) }}';
                    var csrfToken = '{{ csrf_token() }}';
                    // Initial source stats (may be 0 if page loaded before awaiting_source_cleanup;
                    // the polling JS will update window.xferSrcFiles / window.xferSrcBytes live).
                    var srcFiles  = {{ (int)($xfer->total_files ?? 0) }};
                    var srcBytes  = {{ (int)($xfer->total_bytes ?? 0) }};

                    function fmtB(b) {
                        if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB';
                        if (b >= 1048576)    return (b / 1048576).toFixed(2) + ' MB';
                        if (b >= 1024)       return (b / 1024).toFixed(1) + ' KB';
                        return b + ' B';
                    }
                    function setCell(id, html) {
                        var el = document.getElementById(id);
                        if (el) el.innerHTML = html;
                    }

                    window.verifyDestFiles = function() {
                        // Always use the latest values (may have been updated by polling)
                        srcFiles = (window.xferSrcFiles > 0 ? window.xferSrcFiles : srcFiles) || srcFiles;
                        srcBytes = (window.xferSrcBytes > 0 ? window.xferSrcBytes : srcBytes) || srcBytes;

                        var spin = '<i class="fa fa-spinner fa-spin text-muted"></i> Checking&hellip;';
                        setCell('cv-dst-files', spin);
                        setCell('cv-dst-bytes', spin);
                        setCell('cv-files-match', '—');
                        setCell('cv-bytes-match', '—');
                        document.getElementById('cleanup-verify-error').style.display = 'none';
                        document.getElementById('cleanup-verify-ok').style.display    = 'none';
                        var confirmBtn = document.getElementById('btn-confirm-delete');
                        var forceBtn   = document.getElementById('btn-force-delete');
                        if (confirmBtn) confirmBtn.disabled = true;
                        if (forceBtn) {
                            forceBtn.style.display = '';
                            forceBtn.disabled = false;
                        }

                        fetch(verifyUrl, {credentials: 'same-origin'})
                            .then(function(r) { return r.json(); })
                            .then(function(d) {
                                if (d.error) {
                                    setCell('cv-dst-files', '<span class="text-danger">Error</span>');
                                    setCell('cv-dst-bytes', '<span class="text-danger">Error</span>');
                                    var e = document.getElementById('cleanup-verify-error');
                                    e.textContent = 'Could not fetch destination stats: ' + d.error;
                                    e.style.display = '';
                                    if (forceBtn) forceBtn.style.display = '';
                                    return;
                                }
                                var dstFiles = d.dest_file_count  || 0;
                                var dstBytes = d.dest_total_bytes || 0;
                                setCell('cv-dst-files', dstFiles.toLocaleString());
                                setCell('cv-dst-bytes', fmtB(dstBytes));

                                var filesMatch = (srcFiles === 0) || (dstFiles >= srcFiles);
                                setCell('cv-files-match', filesMatch
                                    ? '<span class="text-success"><i class="fa fa-check"></i> OK</span>'
                                    : '<span class="text-warning"><i class="fa fa-exclamation-triangle"></i> ' + dstFiles + '/' + srcFiles + '</span>');

                                var bytesOk = (srcBytes === 0) || (dstBytes >= srcBytes * 0.95);
                                setCell('cv-bytes-match', bytesOk
                                    ? '<span class="text-success"><i class="fa fa-check"></i> OK</span>'
                                    : '<span class="text-warning"><i class="fa fa-exclamation-triangle"></i> ' + fmtB(dstBytes) + '/' + fmtB(srcBytes) + '</span>');

                                if (filesMatch && bytesOk) {
                                    var ok = document.getElementById('cleanup-verify-ok');
                                    ok.textContent = 'Destination verified — file count and size match. Safe to delete source data.';
                                    ok.style.display = '';
                                    if (confirmBtn) confirmBtn.disabled = false;
                                } else {
                                    var w = document.getElementById('cleanup-verify-error');
                                    w.className = 'alert alert-warning';
                                    w.textContent = 'Warning: destination stats do not fully match source manifest. Review before deleting, or use Force Delete to proceed anyway.';
                                    w.style.display = '';
                                    if (forceBtn) forceBtn.style.display = '';
                                }
                            })
                            .catch(function(e) {
                                setCell('cv-dst-files', '<span class="text-danger">Error</span>');
                                setCell('cv-dst-bytes', '<span class="text-danger">Error</span>');
                                var el = document.getElementById('cleanup-verify-error');
                                el.textContent = 'Network error: ' + e.message;
                                el.style.display = '';
                                if (forceBtn) forceBtn.style.display = '';
                            });
                    };

                    window.confirmDeleteSource = function(force) {
                        var msg = force
                            ? 'FORCE DELETE: bypass file verification and permanently delete source data? This cannot be undone!'
                            : 'Permanently delete the source server data? This cannot be undone!';
                        if (!confirm(msg)) return;
                        var confirmBtn = document.getElementById('btn-confirm-delete');
                        var forceBtn   = document.getElementById('btn-force-delete');
                        if (confirmBtn) confirmBtn.disabled = true;
                        if (forceBtn)   forceBtn.disabled   = true;

                        fetch(deleteUrl, {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken},
                            body: JSON.stringify({force: force ? 1 : 0}),
                        })
                        .then(function(r) { return r.json(); })
                        .then(function(d) {
                            if (d.error) {
                                var el = document.getElementById('cleanup-verify-error');
                                el.className = 'alert alert-danger';
                                el.textContent = 'Error: ' + d.error;
                                el.style.display = '';
                                if (confirmBtn) confirmBtn.disabled = false;
                                if (forceBtn)   forceBtn.disabled   = false;
                                return;
                            }
                            var ok = document.getElementById('cleanup-verify-ok');
                            ok.textContent = 'Source data deleted! Transfer fully completed. Reloading…';
                            ok.style.display = '';
                            setTimeout(function() { location.reload(); }, 2000);
                        })
                        .catch(function(e) {
                            var el = document.getElementById('cleanup-verify-error');
                            el.className = 'alert alert-danger';
                            el.textContent = 'Network error: ' + e.message;
                            el.style.display = '';
                            if (confirmBtn) confirmBtn.disabled = false;
                            if (forceBtn)   forceBtn.disabled   = false;
                        });
                    };

                    @if($isAwaitingCleanup)
                    // Auto-trigger verification on page load when already in cleanup state
                    window.verifyDestFiles();
                    @endif
                })();
                </script>
                {{-- New action scripts: resync, force-transfer, cancel-confirmation --}}
                <script>
                (function() {
                    var csrfToken = '{{ csrf_token() }}';
                    var resyncUrl          = '{{ route('admin.servers.view.manage.transfer.resync', $server->id) }}';
                    var resyncProgressUrl  = '{{ route('admin.servers.view.manage.transfer.resync.progress', $server->id) }}';
                    var forceTransferUrl   = '{{ route('admin.servers.view.manage.transfer.force-transfer', $server->id) }}';
                    var forceProgressUrl   = '{{ route('admin.servers.view.manage.transfer.force-transfer.progress', $server->id) }}';
                    var cancelConfirmUrl   = '{{ route('admin.servers.view.manage.transfer.cancel-confirmation', $server->id) }}';

                    function fmtB(b) {
                        if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB';
                        if (b >= 1048576)    return (b / 1048576).toFixed(2) + ' MB';
                        if (b >= 1024)       return (b / 1024).toFixed(1) + ' KB';
                        return b + ' B';
                    }

                    // ── Resync ──────────────────────────────────────────────────────────────
                    var resyncPollTimer = null;

                    window.startResync = function() {
                        if (!confirm('Start file resync? The destination agent will compare all files against the source manifest and re-download any missing or smaller files.')) return;
                        disableActionButtons(true);
                        document.getElementById('resync-panel').style.display = '';
                        document.getElementById('force-transfer-panel').style.display = 'none';

                        fetch(resyncUrl, {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken},
                            body: '{}',
                        })
                        .then(function(r) { return r.json(); })
                        .then(function(d) {
                            if (d.error) {
                                alert('Resync start failed: ' + d.error);
                                disableActionButtons(false);
                                document.getElementById('resync-panel').style.display = 'none';
                                return;
                            }
                            resyncPollTimer = setInterval(pollResyncProgress, 2000);
                        })
                        .catch(function(e) {
                            alert('Network error starting resync: ' + e.message);
                            disableActionButtons(false);
                            document.getElementById('resync-panel').style.display = 'none';
                        });
                    };

                    function pollResyncProgress() {
                        fetch(resyncProgressUrl, {credentials: 'same-origin'})
                        .then(function(r) { return r.json(); })
                        .then(function(d) {
                            var bar = document.getElementById('resync-bar');
                            var txt = document.getElementById('resync-status-text');
                            var det = document.getElementById('resync-detail');

                            if (d.error) {
                                txt.textContent = 'Error: ' + d.error;
                                stopResyncPoll();
                                return;
                            }

                            var pct = d.total_files > 0
                                ? Math.round(((d.files_checked || 0) / d.total_files) * 100) : 0;
                            if (d.status === 'completed') pct = 100;
                            bar.style.width = pct + '%';
                            bar.textContent = pct + '%';
                            txt.textContent = d.status.toUpperCase();
                            det.textContent = 'Checked: ' + (d.files_checked || 0) + '/' + (d.total_files || '?') +
                                              '  |  Resynced: ' + (d.files_resynced || 0) + ' files (' + fmtB(d.bytes_resynced || 0) + ')' +
                                              (d.current_file ? '  |  ' + d.current_file : '');

                            if (d.status === 'completed' || d.status === 'failed') {
                                bar.classList.remove('active');
                                stopResyncPoll();
                                disableActionButtons(false);
                                if (d.status === 'completed') {
                                    txt.textContent = 'Resync complete — ' + (d.files_resynced || 0) + ' files re-synced. Running verification…';
                                    setTimeout(function() { if (typeof window.verifyDestFiles === 'function') window.verifyDestFiles(); }, 1000);
                                } else {
                                    txt.textContent = 'Resync failed: ' + (d.error_msg || 'unknown error');
                                }
                            }
                        })
                        .catch(function() {});
                    }

                    function stopResyncPoll() {
                        if (resyncPollTimer) { clearInterval(resyncPollTimer); resyncPollTimer = null; }
                    }

                    // ── Force archive transfer ──────────────────────────────────────────────
                    var forcePollTimer = null;

                    window.startForceTransfer = function() {
                        if (!confirm('Start FORCE TRANSFER? The entire source volume will be compressed into a single archive and transferred to the destination. This may take a long time for large servers.')) return;
                        disableActionButtons(true);
                        document.getElementById('resync-panel').style.display = 'none';
                        document.getElementById('force-transfer-panel').style.display = '';

                        fetch(forceTransferUrl, {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken},
                            body: '{}',
                        })
                        .then(function(r) { return r.json(); })
                        .then(function(d) {
                            if (d.error) {
                                alert('Force transfer failed: ' + d.error);
                                disableActionButtons(false);
                                document.getElementById('force-transfer-panel').style.display = 'none';
                                return;
                            }
                            forcePollTimer = setInterval(pollForceTransferProgress, 3000);
                        })
                        .catch(function(e) {
                            alert('Network error: ' + e.message);
                            disableActionButtons(false);
                            document.getElementById('force-transfer-panel').style.display = 'none';
                        });
                    };

                    function pollForceTransferProgress() {
                        fetch(forceProgressUrl, {credentials: 'same-origin'})
                        .then(function(r) { return r.json(); })
                        .then(function(d) {
                            var txt = document.getElementById('force-transfer-status-text');
                            var det = document.getElementById('force-transfer-detail');

                            if (d.error) { txt.textContent = 'Error: ' + d.error; stopForcePoll(); return; }

                            txt.textContent = (d.status || '').toUpperCase();
                            det.textContent = 'Files written: ' + (d.files_written || 0) + '  |  Bytes: ' + fmtB(d.bytes_written || 0);

                            if (d.status === 'completed' || d.status === 'failed') {
                                stopForcePoll();
                                disableActionButtons(false);
                                if (d.status === 'completed') {
                                    txt.textContent = 'Force transfer complete — ' + (d.files_written || 0) + ' files written. Running verification…';
                                    setTimeout(function() { if (typeof window.verifyDestFiles === 'function') window.verifyDestFiles(); }, 1000);
                                } else {
                                    txt.textContent = 'Force transfer failed: ' + (d.error_msg || 'unknown error');
                                }
                            }
                        })
                        .catch(function() {});
                    }

                    function stopForcePoll() {
                        if (forcePollTimer) { clearInterval(forcePollTimer); forcePollTimer = null; }
                    }

                    // ── Cancel confirmation & revert to source ──────────────────────────────
                    window.cancelConfirmation = function() {
                        if (!confirm('Cancel this transfer and revert the server back to the SOURCE node?\n\nNo files will be deleted — the server will simply be returned to its original node in the database. You can then re-transfer if needed.')) return;
                        disableActionButtons(true);

                        fetch(cancelConfirmUrl, {
                            method: 'POST',
                            credentials: 'same-origin',
                            headers: {'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken},
                            body: '{}',
                        })
                        .then(function(r) { return r.json(); })
                        .then(function(d) {
                            disableActionButtons(false);
                            if (d.error) {
                                alert('Cancel failed: ' + d.error);
                                return;
                            }
                            alert(d.message || 'Transfer cancelled. Reloading…');
                            location.reload();
                        })
                        .catch(function(e) {
                            disableActionButtons(false);
                            alert('Network error: ' + e.message);
                        });
                    };

                    // ── Helper: toggle all action buttons during async ops ───────────────────
                    function disableActionButtons(disabled) {
                        ['btn-verify-dest', 'btn-confirm-delete', 'btn-force-delete',
                         'btn-fixup-resync', 'btn-force-transfer', 'btn-cancel-confirmation'].forEach(function(id) {
                            var el = document.getElementById(id);
                            if (el) el.disabled = disabled;
                        });
                    }
                })();
                </script>
                {{-- Cleanup confirmation footer: always rendered, shown when awaiting_source_cleanup --}}
                <div id="cleanup-footer" class="box-footer" style="display:{{ $isAwaitingCleanup ? '' : 'none' }};">
                    <button id="btn-verify-dest" class="btn btn-info btn-sm" onclick="verifyDestFiles()">
                        <i class="fa fa-refresh"></i> Refresh Destination Stats
                    </button>
                    &nbsp;
                    <button id="btn-confirm-delete" class="btn btn-success btn-sm" onclick="confirmDeleteSource(false)" disabled>
                        <i class="fa fa-trash"></i> Confirm &amp; Delete Source Data
                    </button>
                    &nbsp;
                    <button id="btn-force-delete" class="btn btn-warning btn-sm" onclick="confirmDeleteSource(true)">
                        <i class="fa fa-exclamation-triangle"></i> Force Delete (Bypass Verify)
                    </button>
                    &nbsp;
                    <button id="btn-fixup-resync" class="btn btn-primary btn-sm" onclick="startResync()">
                        <i class="fa fa-wrench"></i> Fix Transfer (Resync Missing Files)
                    </button>
                    &nbsp;
                    <button id="btn-force-transfer" class="btn btn-default btn-sm" onclick="startForceTransfer()">
                        <i class="fa fa-archive"></i> Force Transfer (Full Archive)
                    </button>
                    &nbsp;
                    <button id="btn-cancel-confirmation" class="btn btn-danger btn-sm" onclick="cancelConfirmation()">
                        <i class="fa fa-undo"></i> Cancel &amp; Revert to Source
                    </button>
                    <br><span class="text-muted small" style="margin-top:4px;display:inline-block;">
                        <strong>Confirm &amp; Delete:</strong> Permanently deletes server data from the <strong>source</strong> node. &nbsp;
                        <strong>Fix Transfer:</strong> Re-downloads only missing/smaller files. &nbsp;
                        <strong>Force Transfer:</strong> Re-transfers entire volume as one archive. &nbsp;
                        <strong>Cancel &amp; Revert:</strong> Cancels transfer, reverts server to source node (no files deleted).
                    </span>

                    {{-- Resync progress panel --}}
                    <div id="resync-panel" style="display:none;margin-top:10px;padding:10px;background:#f5f5f5;border-radius:4px;">
                        <strong><i class="fa fa-refresh fa-spin"></i> Resync in progress…</strong>
                        <span id="resync-status-text" style="margin-left:8px;"></span>
                        <div class="progress" style="margin:6px 0 2px;">
                            <div id="resync-bar" class="progress-bar progress-bar-striped active" role="progressbar" style="min-width:2em;width:0%">0%</div>
                        </div>
                        <small id="resync-detail" class="text-muted"></small>
                    </div>

                    {{-- Force-transfer progress panel --}}
                    <div id="force-transfer-panel" style="display:none;margin-top:10px;padding:10px;background:#f5f5f5;border-radius:4px;">
                        <strong><i class="fa fa-archive fa-spin"></i> Force archive transfer in progress…</strong>
                        <span id="force-transfer-status-text" style="margin-left:8px;"></span>
                        <br><small id="force-transfer-detail" class="text-muted"></small>
                    </div>
                </div>
                {{-- Force-disable footer: shown when transfer is active (not cleanup / not terminal) --}}
                <div id="force-disable-footer" class="box-footer" style="display:{{ (!$isAwaitingCleanup && !in_array($xfer->status, ['completed', 'cancelled'])) ? '' : 'none' }};">
                    <form action="{{ route('admin.servers.view.manage.transfer.force-clear', $server->id) }}" method="POST"
                          onsubmit="return confirm('Force-clear this transfer? The server will no longer be marked as transferring. Only do this if the transfer is genuinely stuck.');">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-danger btn-sm">
                            <i class="fa fa-times-circle"></i> Force Disable Transfer
                        </button>
                        <span class="text-muted small" style="margin-left:10px;">Use this only if the transfer is stuck and will not complete.</span>
                    </form>
                </div>
            </div>
        </div>
    </div>
    @endif

    {{-- (old separate cleanup box removed — cleanup UI is now inside Transfer Status box above) --}}

    <div class="modal fade" id="transferServerModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <form action="{{ route('admin.servers.view.manage.transfer', $server->id) }}" method="POST">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                        <h4 class="modal-title">Transfer Server</h4>
                    </div>

                    <div class="modal-body">
                        <div class="row">
                            <div class="form-group col-md-12">
                                <label for="pNodeId">Node</label>
                                <select name="node_id" id="pNodeId" class="form-control">
                                    @foreach($locations as $location)
                                        <optgroup label="{{ $location->long }} ({{ $location->short }})">
                                            @foreach($location->nodes as $node)

                                                @if($node->id != $server->node_id)
                                                    @php
                                                        $isLimitDisabled = !is_null($node->server_limit) && $node->servers_count >= $node->server_limit;
                                                        $isAgentNode = in_array($node->id, $agentNodeIds);
                                                    @endphp
                                                    <option value="{{ $node->id }}"
                                                            data-agent="{{ $isAgentNode ? '1' : '0' }}"
                                                            data-limit-disabled="{{ $isLimitDisabled ? 'true' : 'false' }}"
                                                            @if($location->id === old('location_id')) selected @endif
                                                            @if($isLimitDisabled) disabled @endif
                                                    >
                                                        {{ $node->name }}
                                                        @if(!is_null($node->server_limit))
                                                            ({{ $node->servers_count }}/{{ $node->server_limit }})
                                                            @if($node->servers_count >= $node->server_limit)
                                                                - limit reached
                                                            @endif
                                                        @endif
                                                    </option>
                                                @endif

                                            @endforeach
                                        </optgroup>
                                    @endforeach
                                </select>
                                <p class="small text-muted no-margin">The node which this server will be transferred to.</p>
                                <p id="agentNodeHint" class="small text-info no-margin" style="display:none;margin-top:4px !important;"><i class="fa fa-info-circle"></i> Only showing nodes with Wings Agent configured.</p>
                            </div>

                            <div class="form-group col-md-12">
                                <label for="pAllocation">Default Allocation</label>
                                <select name="allocation_id" id="pAllocation" class="form-control"></select>
                                <p class="small text-muted no-margin">The main allocation that will be assigned to this server.</p>
                            </div>

                            <div class="form-group col-md-12">
                                <label for="pAllocationAdditional">Additional Allocation(s)</label>
                                <select name="allocation_additional[]" id="pAllocationAdditional" class="form-control" multiple></select>
                                <p class="small text-muted no-margin">Additional allocations to assign to this server on creation.</p>
                            </div>

                            <div class="form-group col-md-12">
                                <hr style="margin: 10px 0;">
                                <div class="checkbox checkbox-primary" style="margin-top: 0;">
                                    <input type="checkbox" name="use_agent_transfer" value="1" id="useAgentTransfer">
                                    <label for="useAgentTransfer">
                                        <strong>Use Wings Agent Transfer</strong> (P2P, chunk-based, resume-capable)
                                    </label>
                                    <p class="small text-muted no-margin">Uses the wings-agent for reliable server migration instead of Wings' built-in transfer.</p>
                                </div>
                            </div>

                            <div class="form-group col-md-12" id="nativeBackupsGroup" style="display:none;">
                                <div class="checkbox checkbox-primary">
                                    <input type="checkbox" name="include_native_backups" value="1" id="includeNativeBackups">
                                    <label for="includeNativeBackups">
                                        Also transfer native Pterodactyl backups
                                    </label>
                                    <p class="small text-muted no-margin">Transfer all successful backup archives for this server to the new node.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        {!! csrf_field() !!}
                        <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-success btn-sm">Confirm</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endsection

@section('footer-scripts')
    @parent
    {!! Theme::js('vendor/lodash/lodash.js') !!}

    @if($canTransfer)
        {!! Theme::js('js/admin/server/transfer.js') !!}
    @endif

    <script>
    document.getElementById('useAgentTransfer')?.addEventListener('change', function() {
        var isChecked = this.checked;

        // Toggle native backups section
        document.getElementById('nativeBackupsGroup').style.display = isChecked ? '' : 'none';
        if (!isChecked) document.getElementById('includeNativeBackups').checked = false;

        // Filter the node dropdown
        var $select = $('#pNodeId');
        var changed = false;

        $select.find('option').each(function() {
            if (!this.value) return; // skip placeholder options
            var isAgent = $(this).data('agent') == '1';
            var isLimitDisabled = $(this).data('limitDisabled') === true || $(this).attr('data-limit-disabled') === 'true';
            if (isChecked) {
                this.disabled = !isAgent || isLimitDisabled;
            } else {
                this.disabled = isLimitDisabled;
            }
        });

        // Hide optgroups that have no enabled options (cleaner UX)
        $select.find('optgroup').each(function() {
            var hasEnabled = $(this).find('option:not(:disabled)').length > 0;
            $(this).prop('disabled', !hasEnabled);
        });

        // If the currently selected node is now disabled, clear the selection
        var currentVal = $select.val();
        if (currentVal && $select.find('option[value="' + currentVal + '"]').prop('disabled')) {
            $select.val(null);
            changed = true;
        }

        // Destroy and recreate select2 so it picks up the new disabled states
        $select.select2('destroy').select2({ placeholder: 'Select a Node' });
        if (changed) {
            $select.trigger('change');
        }

        // Show/hide the hint text
        document.getElementById('agentNodeHint').style.display = isChecked ? '' : 'none';
    });
    </script>
@endsection
