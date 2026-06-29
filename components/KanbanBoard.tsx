'use client';

import { KanbanProvider } from '../context/KanbanContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BoardArea from './BoardArea';
import TaskModal from './TaskModal';
import ArchivedPanel from './ArchivedPanel';

export default function KanbanBoard() {
  return (
    <KanbanProvider>
      <div className="app">
        <Sidebar />
        <div className="main">
          <Topbar />
          <BoardArea />
        </div>
      </div>
      <TaskModal />
      <ArchivedPanel />
    </KanbanProvider>
  );
}
