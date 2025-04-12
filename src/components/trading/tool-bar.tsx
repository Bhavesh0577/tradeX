"use client";

import React from "react";
import {
    MousePointer,
    Crosshair,
    TrendingUp,
    LineChart,
    BarChart2,
    Circle,
    Square,
    Triangle,
    Type,
    Ruler,
    Scissors,
    Trash2
} from "lucide-react";

export function ToolBar() {
    return (
        <div className="w-12 border-r border-gray-800 flex flex-col items-center py-4 gap-6">
            <div className="flex flex-col gap-2">
                <ToolButton icon={<MousePointer className="h-4 w-4" />} tooltip="Cursor" active />
                <ToolButton icon={<Crosshair className="h-4 w-4" />} tooltip="Crosshair" />
            </div>

            <div className="flex flex-col gap-2">
                <ToolButton icon={<TrendingUp className="h-4 w-4" />} tooltip="Trend Line" />
                <ToolButton icon={<LineChart className="h-4 w-4" />} tooltip="Horizontal Line" />
                <ToolButton icon={<BarChart2 className="h-4 w-4" />} tooltip="Vertical Line" />
            </div>

            <div className="flex flex-col gap-2">
                <ToolButton icon={<Circle className="h-4 w-4" />} tooltip="Circle" />
                <ToolButton icon={<Square className="h-4 w-4" />} tooltip="Rectangle" />
                <ToolButton icon={<Triangle className="h-4 w-4" />} tooltip="Triangle" />
            </div>

            <div className="flex flex-col gap-2">
                <ToolButton icon={<Type className="h-4 w-4" />} tooltip="Text" />
                <ToolButton icon={<Ruler className="h-4 w-4" />} tooltip="Measure" />
            </div>

            <div className="mt-auto flex flex-col gap-2">
                <ToolButton icon={<Scissors className="h-4 w-4" />} tooltip="Remove Selected" />
                <ToolButton icon={<Trash2 className="h-4 w-4" />} tooltip="Remove All Drawing Tools" />
            </div>
        </div>
    );
}

interface ToolButtonProps {
    icon: React.ReactNode;
    tooltip: string;
    active?: boolean;
}

function ToolButton({ icon, tooltip, active = false }: ToolButtonProps) {
    return (
        <div className="relative group">
            <button
                className={`w-8 h-8 flex items-center justify-center rounded ${active ? 'bg-[#2962FF] text-white' : 'text-gray-400 hover:bg-[#2A2E39] hover:text-white'
                    }`}
            >
                {icon}
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-[#1E222D] text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {tooltip}
            </div>
        </div>
    );
} 