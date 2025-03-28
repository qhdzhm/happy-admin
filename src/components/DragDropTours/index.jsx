import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, List, Typography, Tag, Space, Button, message, Empty, Spin, Alert } from 'antd';
import { SwapOutlined, PlusOutlined, DeleteOutlined, QuestionCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import './style.scss';

const { Title, Text } = Typography;

// 定义拖拽类型
const ItemTypes = {
  DAYTOUR: 'daytour',
};

// 可拖拽的一日游项目
const DraggableTourItem = ({ tour, index, moveItem, dayNumber, isOptional, onToggleOptional, onRemove }) => {
  // 统一处理字段名，兼容不同数据源
  const tourData = {
    id: tour.dayTourId || tour.day_tour_id || tour.id,
    name: tour.name || tour.dayTourName || tour.day_tour_name || '未命名一日游',
    location: tour.location || '未知地点',
    price: tour.price || 0,
    duration: tour.duration || '未知时长',
    isOptional: isOptional !== undefined ? isOptional : (tour.isOptional || tour.is_optional || false)
  };

  const [{ isDragging }, dragRef] = useDrag({
    type: ItemTypes.DAYTOUR,
    item: () => ({
      id: tourData.id,
      index,
      tour: {
        ...tour,
        dayTourId: tourData.id,
        day_tour_id: tourData.id,
        isOptional: tourData.isOptional
      },
      fromDay: dayNumber,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={dragRef}
      className={`draggable-tour-item ${isDragging ? 'dragging' : ''} ${tourData.isOptional ? 'optional-tour' : ''}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <Card size="small" className="tour-card">
        <div className="tour-info">
          <div className="tour-title">
            <Text strong>{tourData.name}</Text>
            {dayNumber && <Tag color="blue">第{dayNumber}天</Tag>}
            {tourData.isOptional && <Tag color="orange">可选</Tag>}
          </div>
          <div className="tour-details">
            <Text type="secondary">{tourData.location}</Text>
            <Text type="secondary">价格: ¥{tourData.price}</Text>
            <Text type="secondary">时长: {tourData.duration}</Text>
          </div>
        </div>
        {dayNumber && (
          <Space className="tour-actions">
            <Button 
              type="text" 
              icon={tourData.isOptional ? <CheckCircleOutlined /> : <QuestionCircleOutlined />} 
              onClick={() => onToggleOptional(tourData.id)}
              title={tourData.isOptional ? "取消可选" : "设为可选"}
            />
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => onRemove(tourData.id)}
              title="移除"
            />
          </Space>
        )}
      </Card>
    </div>
  );
};

// 可放置的区域 - 左侧可用一日游列表
const AvailableToursList = ({ tours, selectedTours, onAddTour }) => {
  const [filteredTours, setFilteredTours] = useState([]);

  useEffect(() => {
    // 过滤掉已经被选择的一日游
    const selectedIds = selectedTours.map(item => 
      item.dayTourId || item.day_tour_id || item.id
    );
    
    const filtered = tours.filter(tour => {
      const tourId = tour.dayTourId || tour.day_tour_id || tour.id;
      return !selectedIds.includes(tourId);
    });
    
    setFilteredTours(filtered);
  }, [tours, selectedTours]);

  const [{ isOver }, dropRef] = useDrop({
    accept: ItemTypes.DAYTOUR,
    drop: (item) => {
      // 当从右侧拖回来时，移除该一日游
      if (item.fromDay) {
        console.log('从右侧拖回左侧，准备移除一日游:', item);
        onAddTour(item.tour, null, false, item.fromDay);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  return (
    <div 
      ref={dropRef} 
      className={`available-tours-list ${isOver ? 'dragging-over' : ''}`}
    >
      {filteredTours.length > 0 ? (
        <List
          dataSource={filteredTours}
          renderItem={(tour, index) => (
            <DraggableTourItem 
              key={tour.dayTourId || tour.day_tour_id || tour.id} 
              tour={tour} 
              index={index}
            />
          )}
        />
      ) : (
        <Empty description="没有可用的一日游" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  );
};

// 可放置的区域 - 右侧已选择一日游列表
const SelectedToursList = ({ 
  dayNumber, 
  tours, 
  onAddTour, 
  onRemoveTour, 
  onToggleOptional
}) => {
  const [{ isOver }, dropRef] = useDrop({
    accept: ItemTypes.DAYTOUR,
    drop: (item) => {
      // 如果是从其他天数拖过来，移除原来的并添加到新的天数
      if (item.fromDay && item.fromDay !== dayNumber) {
        onAddTour(item.tour, dayNumber, item.tour.isOptional, item.fromDay);
      } 
      // 如果是从左侧拖过来的新一日游
      else if (!item.fromDay) {
        onAddTour(item.tour, dayNumber, false, false);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  // 筛选当前天数的一日游，兼容day_number和dayNumber两种字段名
  const dayTours = tours.filter(tour => 
    tour.dayNumber === dayNumber || tour.day_number === dayNumber
  );

  return (
    <div 
      ref={dropRef} 
      className={`selected-tours-list ${isOver ? 'dragging-over' : ''}`}
    >
      {dayTours.length > 0 ? (
        <List
          dataSource={dayTours}
          renderItem={(tour, index) => (
            <DraggableTourItem 
              key={tour.id || tour.dayTourId || tour.day_tour_id} 
              tour={tour} 
              index={index}
              dayNumber={dayNumber}
              isOptional={tour.isOptional || tour.is_optional}
              onToggleOptional={onToggleOptional}
              onRemove={onRemoveTour}
            />
          )}
        />
      ) : (
        <Empty description={`第${dayNumber}天没有关联一日游`} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  );
};

// 主组件
const DragDropTours = ({ 
  allDayTours, 
  selectedDayTours = [], 
  daysCount = 1, 
  loading = false,
  onSelectedToursChange 
}) => {
  const [toursList, setToursList] = useState([]);
  
  // 处理allDayTours数据
  useEffect(() => {
    if (allDayTours && allDayTours.length > 0) {
      // 标准化一日游数据格式
      const normalizedTours = allDayTours.map(tour => ({
        ...tour,
        id: tour.dayTourId || tour.day_tour_id || tour.id,
        dayTourId: tour.dayTourId || tour.day_tour_id || tour.id,
        name: tour.name || tour.dayTourName || tour.day_tour_name || '未命名一日游',
        location: tour.location || '未知地点',
        price: tour.price || 0,
        duration: tour.duration || '未知时长'
      }));
      
      console.log('规范化后的一日游列表:', normalizedTours);
      setToursList(normalizedTours);
    }
  }, [allDayTours]);
  
  // 标准化selectedDayTours数据
  useEffect(() => {
    if (selectedDayTours.length > 0) {
      // 如果有selectedDayTours但尚未标准化，则进行标准化处理
      const needsNormalization = selectedDayTours.some(tour => 
        (tour.day_number && !tour.dayNumber) || 
        (tour.day_tour_id && !tour.dayTourId) ||
        (tour.day_tour_name && !tour.name)
      );
      
      if (needsNormalization) {
        console.log('需要标准化已选择的一日游数据');
        
        const normalizedSelectedTours = selectedDayTours.map(tour => ({
          ...tour,
          // 同时保留原始字段和标准化字段，确保兼容性
          id: tour.dayTourId || tour.day_tour_id || tour.id,
          dayTourId: tour.dayTourId || tour.day_tour_id || tour.id,
          day_tour_id: tour.dayTourId || tour.day_tour_id || tour.id,
          dayNumber: tour.dayNumber || tour.day_number,
          day_number: tour.dayNumber || tour.day_number,
          name: tour.name || tour.dayTourName || tour.day_tour_name || '未命名一日游',
          dayTourName: tour.name || tour.dayTourName || tour.day_tour_name || '未命名一日游',
          day_tour_name: tour.name || tour.dayTourName || tour.day_tour_name || '未命名一日游',
          isOptional: tour.isOptional || tour.is_optional || false,
          is_optional: tour.isOptional || tour.is_optional || false
        }));
        
        console.log('标准化后的已选择一日游:', normalizedSelectedTours);
        onSelectedToursChange(normalizedSelectedTours);
      }
    }
  }, [selectedDayTours, onSelectedToursChange]);

  const handleAddTour = (tour, dayNumber, isOptional = false, removeFrom = null) => {
    console.log('handleAddTour 参数:', { tour, dayNumber, isOptional, removeFrom });
    
    if (removeFrom) {
      // 从原来的位置移除
      console.log('准备移除一日游从天数:', removeFrom);
      console.log('一日游ID:', tour.dayTourId || tour.id);
      
      // 寻找要移除的一日游
      const tourToRemove = selectedDayTours.find(
        item => ((item.dayTourId === (tour.dayTourId || tour.id) || 
                 item.day_tour_id === (tour.dayTourId || tour.id)) && 
                (item.dayNumber === removeFrom || item.day_number === removeFrom))
      );
      
      if (!tourToRemove) {
        console.log('未找到要移除的一日游，当前选中的一日游列表:', selectedDayTours);
        return;
      }
      
      console.log('找到要移除的一日游:', tourToRemove);
      
      // 从原来的位置移除
      const newSelectedTours = selectedDayTours.filter(
        item => !((item.dayTourId === (tour.dayTourId || tour.id) || 
                  item.day_tour_id === (tour.dayTourId || tour.id)) && 
                 (item.dayNumber === removeFrom || item.day_number === removeFrom))
      );
      
      // 如果传入了新的天数，则添加到新位置
      if (dayNumber) {
        // 检查在目标天数是否已存在相同的一日游
        const existsInTargetDay = selectedDayTours.some(
          item => ((item.dayTourId === (tour.dayTourId || tour.id) || 
                  item.day_tour_id === (tour.dayTourId || tour.id)) && 
                 (item.dayNumber === dayNumber || item.day_number === dayNumber))
        );
        
        // 如果目标天数不存在相同一日游，才添加
        if (!existsInTargetDay) {
          // 使用原始的一日游数据，但更新天数
          const newTour = {
            ...tourToRemove,
            dayNumber: dayNumber,
            day_number: dayNumber,
            isOptional: tourToRemove.isOptional || isOptional,
            id: tourToRemove.dayTourId || tourToRemove.day_tour_id || tourToRemove.id
          };
          
          onSelectedToursChange([...newSelectedTours, newTour]);
          message.success(`已将${tour.name || tour.dayTourName || tour.day_tour_name}从第${removeFrom}天移动到第${dayNumber}天`);
        } else {
          // 如果目标天数已存在相同一日游，只执行移除操作
          onSelectedToursChange(newSelectedTours);
          message.info(`第${dayNumber}天已存在${tour.name || tour.dayTourName || tour.day_tour_name}，已从第${removeFrom}天移除`);
        }
      } else {
        // 只是移除
        onSelectedToursChange(newSelectedTours);
        message.info(`已从第${removeFrom}天移除${tour.name || tour.dayTourName || tour.day_tour_name}`);
      }
    } else if (dayNumber) {
      // 检查是否已存在相同的一日游在任何天数
      const existsInAnyDay = selectedDayTours.some(
        item => (item.dayTourId === (tour.dayTourId || tour.id) || 
                item.day_tour_id === (tour.dayTourId || tour.id))
      );
      
      if (!existsInAnyDay) {
        // 新添加一个一日游
        const newTour = {
          ...tour,
          dayNumber: dayNumber,
          day_number: dayNumber,
          isOptional: isOptional,
          id: tour.dayTourId || tour.id // 确保ID一致
        };
        onSelectedToursChange([...selectedDayTours, newTour]);
        message.success(`已添加${tour.name || tour.dayTourName || tour.day_tour_name}到第${dayNumber}天`);
      } else {
        // 如果已存在，查找它并更新天数（相当于移动）
        const updatedTours = selectedDayTours.map(item => {
          if (item.dayTourId === (tour.dayTourId || tour.id) || 
              item.day_tour_id === (tour.dayTourId || tour.id)) {
            message.success(`已将${tour.name || tour.dayTourName || tour.day_tour_name}移动到第${dayNumber}天`);
            return { 
              ...item, 
              dayNumber: dayNumber, 
              day_number: dayNumber, 
              isOptional: isOptional 
            };
          }
          return item;
        });
        onSelectedToursChange(updatedTours);
      }
    }
  };

  const handleRemoveTour = (tourId) => {
    // 查找要删除的一日游信息，用于显示消息
    const tourToRemove = selectedDayTours.find(tour => 
      tour.id === tourId || 
      tour.dayTourId === tourId || 
      tour.day_tour_id === tourId
    );
    
    if (tourToRemove) {
      const newSelectedTours = selectedDayTours.filter(tour => 
        tour.id !== tourId && 
        tour.dayTourId !== tourId && 
        tour.day_tour_id !== tourId
      );
      onSelectedToursChange(newSelectedTours);
      const dayNum = tourToRemove.dayNumber || tourToRemove.day_number;
      const tourName = tourToRemove.name || tourToRemove.dayTourName || tourToRemove.day_tour_name || '未命名一日游';
      message.info(`已从第${dayNum}天移除${tourName}`);
    }
  };

  const handleToggleOptional = (tourId) => {
    const newSelectedTours = selectedDayTours.map(tour => {
      if (tour.id === tourId || tour.dayTourId === tourId || tour.day_tour_id === tourId) {
        // 获取当前状态
        const currentStatus = tour.isOptional || tour.is_optional || false;
        const newStatus = !currentStatus;
        
        // 获取一日游名称用于消息提示
        const tourName = tour.name || tour.dayTourName || tour.day_tour_name || '未命名一日游';
        message.success(`已将${tourName}设为${newStatus ? '可选' : '必选'}项目`);
        
        // 返回更新后的对象，同时保留原数据结构
        return { 
          ...tour, 
          isOptional: newStatus,
          is_optional: newStatus
        };
      }
      return tour;
    });
    onSelectedToursChange(newSelectedTours);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Spin spinning={loading}>
        <div className="drag-drop-container">
          <div className="drag-tip">
            <Alert
              message="拖拽功能说明"
              description={
                <ul>
                  <li>从<b>左侧</b>拖动一日游到<b>右侧</b>的某一天，可<b>添加</b>一日游到行程</li>
                  <li>从<b>右侧</b>拖动一日游到<b>左侧</b>，可<b>移除</b>该一日游</li>
                  <li>在<b>右侧</b>不同天数之间拖动，可<b>移动</b>一日游（而不是复制）</li>
                  <li>点击一日游卡片上的按钮可设置为<b>必选</b>或<b>可选</b>项目</li>
                </ul>
              }
              type="info"
              showIcon
              closable
            />
          </div>
          <div className="tour-boxes">
            <div className="tour-box left-box">
              <Card title="可用一日游" className="tour-card">
                <div className="tour-list-header">
                  <Text type="secondary">拖拽到右侧添加到跟团游</Text>
                </div>
                <AvailableToursList 
                  tours={toursList} 
                  selectedTours={selectedDayTours}
                  onAddTour={handleAddTour}
                />
              </Card>
            </div>
            <div className="tour-box right-box">
              <Card title="已关联的一日游" className="tour-card">
                <div className="tour-list-header">
                  <Text type="secondary">拖动一日游可在不同天数间移动</Text>
                </div>
                <div className="day-boxes">
                  {Array.from({ length: daysCount }).map((_, index) => (
                    <Card 
                      key={index} 
                      title={`第${index + 1}天`} 
                      size="small" 
                      className="day-card"
                    >
                      <SelectedToursList 
                        dayNumber={index + 1}
                        tours={selectedDayTours}
                        onAddTour={handleAddTour}
                        onRemoveTour={handleRemoveTour}
                        onToggleOptional={handleToggleOptional}
                      />
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Spin>
    </DndProvider>
  );
};

export default DragDropTours; 